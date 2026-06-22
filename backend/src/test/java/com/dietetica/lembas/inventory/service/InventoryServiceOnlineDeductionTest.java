package com.dietetica.lembas.inventory.service;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.inventory.dto.DeductionPlan;
import com.dietetica.lembas.inventory.dto.DeductionPlan.DeductionEntry;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.inventory.model.StockLotStatus;
import com.dietetica.lembas.inventory.model.StockMovement;
import com.dietetica.lembas.inventory.model.StockMovementType;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.inventory.repository.StockMovementRepository;
import com.dietetica.lembas.orders.model.FulfillmentType;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderItem;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.orders.repository.OrderRepository;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link InventoryService#deductForOnlineOrder(Long)}.
 *
 * <p>Covers FEFO ordering, multi-lot allocation, depleted-lot transition,
 * multi-item orders, missing product, missing branch, and STOCK_CONFLICT
 * propagation.</p>
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class InventoryServiceOnlineDeductionTest {

    @Mock private StockLotRepository stockLotRepository;
    @Mock private StockMovementRepository stockMovementRepository;
    @Mock private ProductRepository productRepository;
    @Mock private BranchRepository branchRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private FefoStockDeductionPolicy fefoPolicy;
    @Mock private SecurityContextHelper securityContextHelper;

    private InventoryService service;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.systemUTC();
        service = new InventoryService(
                stockLotRepository,
                stockMovementRepository,
                productRepository,
                branchRepository,
                orderRepository,
                fefoPolicy,
                securityContextHelper,
                clock
        );
    }

    @Test
    void shouldDeductFromOneLotAndRecordOnlineSaleMovement() {
        Order order = orderWith(branchWithId(1L), product(1L, new BigDecimal("2.000")));
        Product product = order.getItems().get(0).getProduct();
        StockLot lot = lot(10L, product, order.getBranch(), new BigDecimal("5.000"));

        when(orderRepository.findWithItemsById(order.getId())).thenReturn(Optional.of(order));
        when(productRepository.findByIdAndActiveTrue(product.getId())).thenReturn(Optional.of(product));
        when(stockLotRepository.findAvailableLotsForUpdate(product.getId(), 1L)).thenReturn(List.of(lot));
        when(stockLotRepository.findById(10L)).thenReturn(Optional.of(lot));
        when(fefoPolicy.plan(anyList(), any()))
                .thenReturn(new DeductionPlan(
                        List.of(new DeductionEntry(10L, new BigDecimal("2.000"), new BigDecimal("5.000"), new BigDecimal("3.000"))),
                        new BigDecimal("2.000"),
                        new BigDecimal("5.000"),
                        true));

        service.deductForOnlineOrder(order.getId());

        assertThat(lot.getQuantityAvailable()).isEqualByComparingTo("3.000");
        assertThat(lot.getStatus()).isEqualTo(StockLotStatus.ACTIVE);
        ArgumentCaptor<StockMovement> captor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository, times(1)).save(captor.capture());
        StockMovement movement = captor.getValue();
        assertThat(movement.getType()).isEqualTo(StockMovementType.ONLINE_SALE);
        assertThat(movement.getQuantity()).isEqualByComparingTo("-2.000");
        assertThat(movement.getOrderId()).isEqualTo(order.getId());
        assertThat(movement.getReferenceType()).isEqualTo("ORDER");
        verify(stockLotRepository, times(1)).flush();
    }

    @Test
    void shouldMarkLotAsDepletedWhenDeductionReachesZero() {
        Order order = orderWith(branchWithId(1L), product(1L, new BigDecimal("5.000")));
        Product product = order.getItems().get(0).getProduct();
        StockLot lot = lot(10L, product, order.getBranch(), new BigDecimal("5.000"));

        when(orderRepository.findWithItemsById(order.getId())).thenReturn(Optional.of(order));
        when(productRepository.findByIdAndActiveTrue(product.getId())).thenReturn(Optional.of(product));
        when(stockLotRepository.findAvailableLotsForUpdate(product.getId(), 1L)).thenReturn(List.of(lot));
        when(stockLotRepository.findById(10L)).thenReturn(Optional.of(lot));
        when(fefoPolicy.plan(anyList(), any()))
                .thenReturn(new DeductionPlan(
                        List.of(new DeductionEntry(10L, new BigDecimal("5.000"), new BigDecimal("5.000"), BigDecimal.ZERO)),
                        new BigDecimal("5.000"),
                        new BigDecimal("5.000"),
                        true));

        service.deductForOnlineOrder(order.getId());

        assertThat(lot.getQuantityAvailable()).isEqualByComparingTo("0.000");
        assertThat(lot.getStatus()).isEqualTo(StockLotStatus.DEPLETED);
    }

    @Test
    void shouldPropagateStockConflictFromFefoPolicy() {
        Order order = orderWith(branchWithId(1L), product(1L, new BigDecimal("5.000")));
        Product product = order.getItems().get(0).getProduct();
        StockLot lot = lot(10L, product, order.getBranch(), new BigDecimal("1.000"));

        when(orderRepository.findWithItemsById(order.getId())).thenReturn(Optional.of(order));
        when(productRepository.findByIdAndActiveTrue(product.getId())).thenReturn(Optional.of(product));
        when(stockLotRepository.findAvailableLotsForUpdate(product.getId(), 1L)).thenReturn(List.of(lot));
        when(fefoPolicy.plan(any(), any()))
                .thenThrow(new DomainException("INSUFFICIENT_STOCK", org.springframework.http.HttpStatus.CONFLICT, "Insufficient"));

        assertThatThrownBy(() -> service.deductForOnlineOrder(order.getId()))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("INSUFFICIENT_STOCK");
        verify(stockMovementRepository, never()).save(any());
    }

    @Test
    void shouldDeductAcrossMultipleLots() {
        Order order = orderWith(branchWithId(1L), product(1L, new BigDecimal("7.000")));
        Product product = order.getItems().get(0).getProduct();
        StockLot lot1 = lot(10L, product, order.getBranch(), new BigDecimal("3.000"));
        StockLot lot2 = lot(11L, product, order.getBranch(), new BigDecimal("5.000"));

        when(orderRepository.findWithItemsById(order.getId())).thenReturn(Optional.of(order));
        when(productRepository.findByIdAndActiveTrue(product.getId())).thenReturn(Optional.of(product));
        when(stockLotRepository.findAvailableLotsForUpdate(product.getId(), 1L)).thenReturn(List.of(lot1, lot2));
        when(stockLotRepository.findById(10L)).thenReturn(Optional.of(lot1));
        when(stockLotRepository.findById(11L)).thenReturn(Optional.of(lot2));
        when(fefoPolicy.plan(anyList(), any()))
                .thenReturn(new DeductionPlan(
                        List.of(
                                new DeductionEntry(10L, new BigDecimal("3.000"), new BigDecimal("3.000"), BigDecimal.ZERO),
                                new DeductionEntry(11L, new BigDecimal("4.000"), new BigDecimal("5.000"), new BigDecimal("1.000"))
                        ),
                        new BigDecimal("7.000"),
                        new BigDecimal("8.000"),
                        true));

        service.deductForOnlineOrder(order.getId());

        assertThat(lot1.getQuantityAvailable()).isEqualByComparingTo("0.000");
        assertThat(lot1.getStatus()).isEqualTo(StockLotStatus.DEPLETED);
        assertThat(lot2.getQuantityAvailable()).isEqualByComparingTo("1.000");
        assertThat(lot2.getStatus()).isEqualTo(StockLotStatus.ACTIVE);
        verify(stockMovementRepository, times(2)).save(any());
    }

    @Test
    void shouldDeductEachItemInMultiItemOrder() {
        Order order = orderWith(branchWithId(1L),
                product(1L, new BigDecimal("1.000")), new BigDecimal("1.000"),
                product(2L, new BigDecimal("2.000")), new BigDecimal("2.000"));
        Product p1 = order.getItems().get(0).getProduct();
        Product p2 = order.getItems().get(1).getProduct();
        StockLot lot1 = lot(10L, p1, order.getBranch(), new BigDecimal("5.000"));
        StockLot lot2 = lot(20L, p2, order.getBranch(), new BigDecimal("5.000"));

        when(orderRepository.findWithItemsById(order.getId())).thenReturn(Optional.of(order));
        when(productRepository.findByIdAndActiveTrue(p1.getId())).thenReturn(Optional.of(p1));
        when(productRepository.findByIdAndActiveTrue(p2.getId())).thenReturn(Optional.of(p2));
        when(stockLotRepository.findAvailableLotsForUpdate(p1.getId(), 1L)).thenReturn(List.of(lot1));
        when(stockLotRepository.findAvailableLotsForUpdate(p2.getId(), 1L)).thenReturn(List.of(lot2));
        when(stockLotRepository.findById(10L)).thenReturn(Optional.of(lot1));
        when(stockLotRepository.findById(20L)).thenReturn(Optional.of(lot2));
        when(fefoPolicy.plan(anyList(), org.mockito.ArgumentMatchers.eq(new BigDecimal("1.000"))))
                .thenReturn(new DeductionPlan(
                        List.of(new DeductionEntry(10L, new BigDecimal("1.000"), new BigDecimal("5.000"), new BigDecimal("4.000"))),
                        new BigDecimal("1.000"),
                        new BigDecimal("5.000"),
                        true));
        when(fefoPolicy.plan(anyList(), org.mockito.ArgumentMatchers.eq(new BigDecimal("2.000"))))
                .thenReturn(new DeductionPlan(
                        List.of(new DeductionEntry(20L, new BigDecimal("2.000"), new BigDecimal("5.000"), new BigDecimal("3.000"))),
                        new BigDecimal("2.000"),
                        new BigDecimal("5.000"),
                        true));

        service.deductForOnlineOrder(order.getId());

        assertThat(lot1.getQuantityAvailable()).isEqualByComparingTo("4.000");
        assertThat(lot2.getQuantityAvailable()).isEqualByComparingTo("3.000");
        verify(stockMovementRepository, times(2)).save(any());
    }


    @Test
    void shouldRejectOrderWithoutItems() {
        Order order = new Order();
        order.setId(99L);
        order.setOrderNumber("ON-99");
        order.setType(OrderType.ONLINE);
        order.setStatus(OrderStatus.PAID);
        order.setFulfillmentType(FulfillmentType.PICKUP);
        order.setSubtotal(BigDecimal.ZERO);
        order.setDiscountTotal(BigDecimal.ZERO);
        order.setTotal(BigDecimal.ZERO);
        order.setBranch(branchWithId(1L));

        when(orderRepository.findWithItemsById(99L)).thenReturn(Optional.of(order));

        // No items -> nothing to deduct but also no exception; flush called for safety.
        service.deductForOnlineOrder(99L);
        verify(stockMovementRepository, never()).save(any());
    }

    @Test
    void shouldRejectWhenProductInactive() {
        Order order = orderWith(branchWithId(1L), product(1L, new BigDecimal("1.000")));
        when(orderRepository.findWithItemsById(order.getId())).thenReturn(Optional.of(order));
        when(productRepository.findByIdAndActiveTrue(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deductForOnlineOrder(order.getId()))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("PRODUCT_NOT_FOUND");
    }

    @Test
    void shouldRejectWhenOrderNotFound() {
        when(orderRepository.findWithItemsById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deductForOnlineOrder(404L))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("ORDER_NOT_FOUND");
    }

    // --------------------------------------------------------------------
    // helpers
    // --------------------------------------------------------------------

    private static Branch branchWithId(long id) {
        try {
            java.lang.reflect.Constructor<Branch> ctor = Branch.class.getDeclaredConstructor();
            ctor.setAccessible(true);
            Branch branch = ctor.newInstance();
            java.lang.reflect.Field idField = Branch.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(branch, id);
            java.lang.reflect.Field nameField = Branch.class.getDeclaredField("name");
            nameField.setAccessible(true);
            nameField.set(branch, "Centro");
            return branch;
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    private static Product product(long id, BigDecimal quantity) {
        Product product = mock(Product.class);
        when(product.getId()).thenReturn(id);
        when(product.getName()).thenReturn("Product " + id);
        when(product.isActive()).thenReturn(true);
        return product;
    }

    private static StockLot lot(long id, Product product, Branch branch, BigDecimal available) {
        StockLot lot = new StockLot();
        try {
            java.lang.reflect.Field idField = StockLot.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(lot, id);
            java.lang.reflect.Field productField = StockLot.class.getDeclaredField("product");
            productField.setAccessible(true);
            productField.set(lot, product);
            java.lang.reflect.Field branchField = StockLot.class.getDeclaredField("branch");
            branchField.setAccessible(true);
            branchField.set(lot, branch);
            java.lang.reflect.Field qtyField = StockLot.class.getDeclaredField("quantityAvailable");
            qtyField.setAccessible(true);
            qtyField.set(lot, available);
            java.lang.reflect.Field statusField = StockLot.class.getDeclaredField("status");
            statusField.setAccessible(true);
            statusField.set(lot, StockLotStatus.ACTIVE);
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
        return lot;
    }

    private static Order orderWith(Branch branch, Product... products) {
        BigDecimal[] quantities = new BigDecimal[products.length];
        for (int i = 0; i < products.length; i++) {
            quantities[i] = new BigDecimal("1.000");
        }
        return orderWithQuantities(branch, products, quantities);
    }

    private static Order orderWith(Branch branch, Product product, BigDecimal quantity) {
        return orderWithQuantities(branch, new Product[]{product}, new BigDecimal[]{quantity});
    }

    private static Order orderWith(Branch branch, Product p1, BigDecimal q1, Product p2, BigDecimal q2) {
        return orderWithQuantities(branch, new Product[]{p1, p2}, new BigDecimal[]{q1, q2});
    }

    private static Order orderWithQuantities(Branch branch, Product[] products, BigDecimal[] quantities) {
        Order order = new Order();
        order.setId(1L);
        order.setOrderNumber("ON-1");
        order.setType(OrderType.ONLINE);
        order.setStatus(OrderStatus.PAID);
        order.setFulfillmentType(FulfillmentType.PICKUP);
        order.setSubtotal(new BigDecimal("100.00"));
        order.setDiscountTotal(BigDecimal.ZERO);
        order.setTotal(new BigDecimal("100.00"));
        order.setBranch(branch);
        for (int i = 0; i < products.length; i++) {
            OrderItem item = new OrderItem();
            item.setId((long) (order.getItems().size() + 1));
            item.setOrder(order);
            item.setProduct(products[i]);
            item.setQuantity(quantities[i]);
            item.setUnitPrice(new BigDecimal("100.00"));
            item.setSubtotalAmount(new BigDecimal("100.00"));
            item.setProductNameSnapshot("Product " + products[i].getId());
            order.addItem(item);
        }
        return order;
    }

    // Silence unused import warnings (LocalDate is used by sibling tests in same package).
    @SuppressWarnings("unused")
    private static final Class<?> KEEP_LD = LocalDate.class;
}
