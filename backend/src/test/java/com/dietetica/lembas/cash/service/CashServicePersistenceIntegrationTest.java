package com.dietetica.lembas.cash.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.dietetica.lembas.AbstractIntegrationTest;
import com.dietetica.lembas.cash.dto.CashCloseRequest;
import com.dietetica.lembas.cash.dto.CashSessionDto;
import com.dietetica.lembas.cash.dto.CreateCashMovementRequest;
import com.dietetica.lembas.cash.dto.OpenCashSessionRequest;
import com.dietetica.lembas.cash.model.CashMovement;
import com.dietetica.lembas.cash.model.CashMovementMethod;
import com.dietetica.lembas.cash.model.CashMovementType;
import com.dietetica.lembas.cash.model.CashSession;
import com.dietetica.lembas.cash.model.CashSessionStatus;
import com.dietetica.lembas.cash.repository.CashMovementRepository;
import com.dietetica.lembas.cash.repository.CashSessionRepository;
import com.dietetica.lembas.catalog.model.Category;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import com.dietetica.lembas.catalog.repository.CategoryRepository;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.inventory.model.StockLotStatus;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.inventory.repository.StockMovementRepository;
import com.dietetica.lembas.orders.repository.OrderRepository;
import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentMethod;
import com.dietetica.lembas.payments.model.PaymentStatus;
import com.dietetica.lembas.payments.repository.PaymentRepository;
import com.dietetica.lembas.pos.dto.CreatePosSaleItemRequest;
import com.dietetica.lembas.pos.dto.CreatePosSaleRequest;
import com.dietetica.lembas.pos.service.PosSaleService;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import com.dietetica.lembas.users.repository.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.groups.Tuple.tuple;

/**
 * PostgreSQL characterization tests for durable cash-session behavior.
 *
 * <p>They deliberately invoke the public application services and clear the
 * persistence context before asserting so cash rules are verified against the
 * committed Flyway schema rather than managed entity state.</p>
 */
class CashServicePersistenceIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private CashService cashService;

    @Autowired
    private PosSaleService posSaleService;

    @Autowired
    private TransactionTemplate transactionTemplate;

    @Autowired
    private jakarta.persistence.EntityManager entityManager;

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private StockLotRepository stockLotRepository;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private CashMovementRepository cashMovementRepository;

    @Autowired
    private CashSessionRepository cashSessionRepository;

    @Autowired
    private UserRepository userRepository;

    private Branch branch;
    private User employee;

    @BeforeEach
    void seedFixtures() {
        transactionTemplate.executeWithoutResult(status -> {
            stockMovementRepository.deleteAllInBatch();
            paymentRepository.deleteAllInBatch();
            orderRepository.deleteAllInBatch();
            cashMovementRepository.deleteAllInBatch();
            cashSessionRepository.deleteAllInBatch();
            stockLotRepository.deleteAllInBatch();
            entityManager
                    .createNativeQuery("DELETE FROM supplier_product_cost_history")
                    .executeUpdate();
            entityManager.createNativeQuery("DELETE FROM supplier_products").executeUpdate();
            productRepository.deleteAllInBatch();
            categoryRepository.deleteAllInBatch();
            userRepository.deleteAllInBatch();
        });
        entityManager.clear();

        branch = defaultBranch();
        employee = userRepository.saveAndFlush(
                new User(branch.getId(), "cashier@cash-it.com", "hash", "Cash", "Employee", null, Role.EMPLOYEE));
    }

    @Test
    void closePersistsPhysicalCashOnlyAfterCashAndNonCashPosSales() {
        CashSessionDto session = openSession(employee, new BigDecimal("100.00"), null);
        Product product = persistProductWithStock(new BigDecimal("25.00"), new BigDecimal("4"));

        posSaleService.createSale(saleRequest(product.getId(), PaymentMethod.CASH), employee);
        posSaleService.createSale(saleRequest(product.getId(), PaymentMethod.QR), employee);
        cashService.addMovement(
                session.id(), movement(CashMovementType.CASH_IN, CashMovementMethod.CASH, "10.00"), employee);
        cashService.addMovement(
                session.id(), movement(CashMovementType.CASH_OUT, CashMovementMethod.CASH, "4.00"), employee);
        cashService.addMovement(
                session.id(), movement(CashMovementType.CASH_IN, CashMovementMethod.TRANSFER, "80.00"), employee);

        cashService.closeCashSession(
                session.id(), new CashCloseRequest(new BigDecimal("131.00"), "counted", null), employee);

        entityManager.clear();
        CashSession closed = cashSessionRepository.findById(session.id()).orElseThrow();
        assertThat(closed.getStatus()).isEqualTo(CashSessionStatus.CLOSED);
        assertThat(closed.getExpectedCashAmount()).isEqualByComparingTo("131.00");
        assertThat(closed.getCountedCashAmount()).isEqualByComparingTo("131.00");
        assertThat(closed.getCashDifferenceAmount()).isEqualByComparingTo("0.00");
        assertThat(closedByUserId(session.id())).isEqualTo(employee.getId());
        assertThat(paymentRepository.findByCashSessionIdAndStatusOrderByIdAsc(session.id(), PaymentStatus.APPROVED))
                .extracting(Payment::getMethod, Payment::getAmount)
                .containsExactlyInAnyOrder(
                        tuple(PaymentMethod.CASH, new BigDecimal("25.00")),
                        tuple(PaymentMethod.QR, new BigDecimal("25.00")));
        assertThat(cashMovementRepository.findByCashSessionIdOrderByCreatedAtAsc(session.id()))
                .extracting(CashMovement::getType, CashMovement::getMethod, CashMovement::getAmount)
                .containsExactlyInAnyOrder(
                        tuple(CashMovementType.CASH_IN, CashMovementMethod.CASH, new BigDecimal("10.00")),
                        tuple(CashMovementType.CASH_OUT, CashMovementMethod.CASH, new BigDecimal("4.00")),
                        tuple(CashMovementType.CASH_IN, CashMovementMethod.TRANSFER, new BigDecimal("80.00")));
    }

    @Test
    void employeeBranchIsDerivedAtOpenAndClosedSessionRejectsFurtherMutations() {
        CashSessionDto session = openSession(employee, new BigDecimal("20.00"), Long.MAX_VALUE);

        assertThat(session.branchId()).isEqualTo(branch.getId());
        cashService.addMovement(
                session.id(), movement(CashMovementType.CASH_IN, CashMovementMethod.CASH, "5.00"), employee);
        cashService.closeCashSession(session.id(), new CashCloseRequest(new BigDecimal("25.00"), null, null), employee);

        assertThatThrownBy(() -> cashService.closeCashSession(
                        session.id(), new CashCloseRequest(new BigDecimal("25.00"), null, null), employee))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("CASH_SESSION_ALREADY_CLOSED");
        assertThatThrownBy(() -> cashService.addMovement(
                        session.id(), movement(CashMovementType.CASH_OUT, CashMovementMethod.CASH, "1.00"), employee))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("CASH_MOVEMENT_CLOSED_SESSION");

        entityManager.clear();
        CashSession closed = cashSessionRepository.findById(session.id()).orElseThrow();
        assertThat(closed.getStatus()).isEqualTo(CashSessionStatus.CLOSED);
        assertThat(closed.getExpectedCashAmount()).isEqualByComparingTo("25.00");
        assertThat(cashMovementRepository.findByCashSessionIdOrderByCreatedAtAsc(session.id()))
                .hasSize(1);
    }

    @Test
    void customerCannotOpenMoveOrCloseAndZeroAmountDoesNotCreateMovement() {
        User customer = userRepository.saveAndFlush(
                new User(null, "customer@cash-it.com", "hash", "Cash", "Customer", null, Role.CUSTOMER));
        CashSessionDto session = openSession(employee, BigDecimal.ZERO, null);

        assertThatThrownBy(() -> cashService.openCashSession(
                        new OpenCashSessionRequest(BigDecimal.ZERO, null, branch.getId()), customer))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("ACCESS_DENIED");
        assertThatThrownBy(() -> cashService.addMovement(
                        session.id(), movement(CashMovementType.CASH_IN, CashMovementMethod.CASH, "1.00"), customer))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("ACCESS_DENIED");
        assertThatThrownBy(() -> cashService.closeCashSession(
                        session.id(), new CashCloseRequest(BigDecimal.ZERO, null, null), customer))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("ACCESS_DENIED");
        assertThatThrownBy(() -> cashService.addMovement(
                        session.id(), movement(CashMovementType.CASH_IN, CashMovementMethod.CASH, "0.00"), employee))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("VALIDATION_ERROR");

        entityManager.clear();
        assertThat(cashSessionRepository.findById(session.id()).orElseThrow().getStatus())
                .isEqualTo(CashSessionStatus.OPEN);
        assertThat(cashMovementRepository.findByCashSessionIdOrderByCreatedAtAsc(session.id()))
                .isEmpty();
    }

    private CashSessionDto openSession(User opener, BigDecimal openingAmount, Long requestedBranchId) {
        return cashService.openCashSession(new OpenCashSessionRequest(openingAmount, null, requestedBranchId), opener);
    }

    private Product persistProductWithStock(BigDecimal price, BigDecimal available) {
        Category category = categoryRepository.saveAndFlush(new Category("Cash integration", null));
        Product product = new Product();
        product.setName("Cash integration product");
        product.setCategory(category);
        product.setBarcode("7790000000011");
        product.setSalePrice(price);
        product.setOnlineStatus(ProductOnlineStatus.PUBLISHED);
        product.setActive(true);
        product = productRepository.saveAndFlush(product);

        StockLot lot = new StockLot();
        lot.setProduct(product);
        lot.setBranch(branch);
        lot.setInitialQuantity(available);
        lot.setQuantityAvailable(available);
        lot.setUnitCost(new BigDecimal("10.00"));
        lot.setCostPrice(new BigDecimal("10.00"));
        lot.setLotCode("CASH-LOT");
        lot.setStatus(StockLotStatus.ACTIVE);
        stockLotRepository.saveAndFlush(lot);
        return product;
    }

    private static CreatePosSaleRequest saleRequest(Long productId, PaymentMethod paymentMethod) {
        return new CreatePosSaleRequest(List.of(new CreatePosSaleItemRequest(productId, 1)), paymentMethod, null, null);
    }

    private static CreateCashMovementRequest movement(CashMovementType type, CashMovementMethod method, String amount) {
        return new CreateCashMovementRequest(type, method, new BigDecimal(amount), "Cash test movement");
    }

    private Branch defaultBranch() {
        return branchRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Seed branch is required for cash tests"));
    }

    private Long closedByUserId(Long sessionId) {
        return transactionTemplate.execute(status -> entityManager
                .createQuery(
                        "select session.closedByUser.id from CashSession session where session.id = :sessionId",
                        Long.class)
                .setParameter("sessionId", sessionId)
                .getSingleResult());
    }
}
