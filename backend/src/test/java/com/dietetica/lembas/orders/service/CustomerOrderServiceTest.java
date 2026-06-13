package com.dietetica.lembas.orders.service;

import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.orders.dto.CreateOnlineOrderItemRequest;
import com.dietetica.lembas.orders.dto.CreateOnlineOrderRequest;
import com.dietetica.lembas.orders.dto.OrderCreatedDto;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.orders.repository.OrderRepository;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link CustomerOrderService}.
 *
 * <p>Verifies the core business rules for online order creation:</p>
 * <ul>
 *   <li>Successful order creation with correct snapshots and totals</li>
 *   <li>INSUFFICIENT_STOCK when branch stock is below requested quantity</li>
 *   <li>PRODUCT_NOT_FOUND when product is inactive or not published</li>
 *   <li>BRANCH_NOT_FOUND when branch does not exist or is inactive</li>
 *   <li>ACCESS_DENIED when a non-customer user attempts to create an order</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class CustomerOrderServiceTest {

    @Mock
    private OrderRepository orderRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private BranchRepository branchRepository;
    @Mock
    private StockLotRepository stockLotRepository;
    @Mock
    private OrderNumberGenerator orderNumberGenerator;
    @Mock
    private OrderMapper orderMapper;

    @InjectMocks
    private CustomerOrderService customerOrderService;

    @Test
    void shouldCreateOrderWhenStockIsSufficient() {
        User customer = customer();
        Branch branch = branch();
        Product product = product("Yerba Mate");

        when(branchRepository.findById(1L)).thenReturn(Optional.of(branch));
        when(productRepository.findByIdAndActiveTrueAndOnlineStatus(1L, ProductOnlineStatus.PUBLISHED))
                .thenReturn(Optional.of(product));
        when(stockLotRepository.calculateAvailableQuantity(1L, 1L))
                .thenReturn(new BigDecimal("10"));
        when(orderNumberGenerator.next(OrderType.ONLINE)).thenReturn("ON-20260612-000001");

        // Capture the order passed to save()
        when(orderRepository.save(any())).thenAnswer(invocation -> {
            // Simulate JPA save by returning the same object with an id
            var order = invocation.getArgument(0);
            var idField = order.getClass().getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(order, 42L);
            return order;
        });

        CreateOnlineOrderRequest request = new CreateOnlineOrderRequest(
                1L,
                List.of(new CreateOnlineOrderItemRequest(1L, new BigDecimal("2"))),
                null
        );

        OrderCreatedDto result = customerOrderService.createOnlineOrder(request, customer);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(42L);
        assertThat(result.orderNumber()).isEqualTo("ON-20260612-000001");
        assertThat(result.status()).isEqualTo(OrderStatus.PENDING_PAYMENT);
        assertThat(result.total()).isEqualByComparingTo("200.00");
    }

    @Test
    void shouldThrowInsufficientStockWhenQuantityExceedsAvailable() {
        User customer = customer();
        Branch branch = branch();
        Product product = product("Alfajor sin TACC");

        when(branchRepository.findById(1L)).thenReturn(Optional.of(branch));
        when(productRepository.findByIdAndActiveTrueAndOnlineStatus(1L, ProductOnlineStatus.PUBLISHED))
                .thenReturn(Optional.of(product));
        when(stockLotRepository.calculateAvailableQuantity(1L, 1L))
                .thenReturn(new BigDecimal("3"));

        CreateOnlineOrderRequest request = new CreateOnlineOrderRequest(
                1L,
                List.of(new CreateOnlineOrderItemRequest(1L, new BigDecimal("5"))),
                null
        );

        assertThatThrownBy(() -> customerOrderService.createOnlineOrder(request, customer))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> {
                    DomainException de = (DomainException) ex;
                    assertThat(de.getCode()).isEqualTo("INSUFFICIENT_STOCK");
                });
    }

    @Test
    void shouldThrowProductNotFoundWhenProductIsNotPublished() {
        User customer = customer();
        Branch branch = branch();

        when(branchRepository.findById(1L)).thenReturn(Optional.of(branch));
        when(productRepository.findByIdAndActiveTrueAndOnlineStatus(1L, ProductOnlineStatus.PUBLISHED))
                .thenReturn(Optional.empty());

        CreateOnlineOrderRequest request = new CreateOnlineOrderRequest(
                1L,
                List.of(new CreateOnlineOrderItemRequest(1L, BigDecimal.ONE)),
                null
        );

        assertThatThrownBy(() -> customerOrderService.createOnlineOrder(request, customer))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> {
                    DomainException de = (DomainException) ex;
                    assertThat(de.getCode()).isEqualTo("PRODUCT_NOT_FOUND");
                });
    }

    @Test
    void shouldThrowBranchNotFoundWhenBranchDoesNotExist() {
        User customer = customer();

        when(branchRepository.findById(999L)).thenReturn(Optional.empty());

        CreateOnlineOrderRequest request = new CreateOnlineOrderRequest(
                999L,
                List.of(new CreateOnlineOrderItemRequest(1L, BigDecimal.ONE)),
                null
        );

        assertThatThrownBy(() -> customerOrderService.createOnlineOrder(request, customer))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> {
                    DomainException de = (DomainException) ex;
                    assertThat(de.getCode()).isEqualTo("BRANCH_NOT_FOUND");
                });
    }

    @Test
    void shouldThrowBranchNotFoundWhenBranchIsInactive() throws Exception {
        User customer = customer();
        Branch inactiveBranch = branch();
        setField(inactiveBranch, "active", false);

        when(branchRepository.findById(1L)).thenReturn(Optional.of(inactiveBranch));

        CreateOnlineOrderRequest request = new CreateOnlineOrderRequest(
                1L,
                List.of(new CreateOnlineOrderItemRequest(1L, BigDecimal.ONE)),
                null
        );

        assertThatThrownBy(() -> customerOrderService.createOnlineOrder(request, customer))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> {
                    DomainException de = (DomainException) ex;
                    assertThat(de.getCode()).isEqualTo("BRANCH_NOT_FOUND");
                });
    }

    @Test
    void shouldThrowAccessDeniedWhenUserIsNotCustomer() {
        User employee = new User(1L, "emp@lembas.com", "hash", "Emp", "LOYEE", null, Role.EMPLOYEE);

        CreateOnlineOrderRequest request = new CreateOnlineOrderRequest(
                1L,
                List.of(new CreateOnlineOrderItemRequest(1L, BigDecimal.ONE)),
                null
        );

        assertThatThrownBy(() -> customerOrderService.createOnlineOrder(request, employee))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> {
                    DomainException de = (DomainException) ex;
                    assertThat(de.getCode()).isEqualTo("ACCESS_DENIED");
                });
    }

    @Test
    void shouldThrowAccessDeniedWhenUserIsNull() {
        CreateOnlineOrderRequest request = new CreateOnlineOrderRequest(
                1L,
                List.of(new CreateOnlineOrderItemRequest(1L, BigDecimal.ONE)),
                null
        );

        assertThatThrownBy(() -> customerOrderService.createOnlineOrder(request, null))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> {
                    DomainException de = (DomainException) ex;
                    assertThat(de.getCode()).isEqualTo("ACCESS_DENIED");
                });
    }

    @Test
    void shouldMergeDuplicateProductLines() {
        User customer = customer();
        Branch branch = branch();
        Product product = product("Granola");

        when(branchRepository.findById(1L)).thenReturn(Optional.of(branch));
        when(productRepository.findByIdAndActiveTrueAndOnlineStatus(1L, ProductOnlineStatus.PUBLISHED))
                .thenReturn(Optional.of(product));
        when(stockLotRepository.calculateAvailableQuantity(1L, 1L))
                .thenReturn(new BigDecimal("20"));
        when(orderNumberGenerator.next(OrderType.ONLINE)).thenReturn("ON-20260612-000002");
        when(orderRepository.save(any())).thenAnswer(invocation -> {
            var order = invocation.getArgument(0);
            var idField = order.getClass().getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(order, 43L);
            return order;
        });

        // Two lines for the same product should be merged into one with combined quantity
        CreateOnlineOrderRequest request = new CreateOnlineOrderRequest(
                1L,
                List.of(
                        new CreateOnlineOrderItemRequest(1L, new BigDecimal("2")),
                        new CreateOnlineOrderItemRequest(1L, new BigDecimal("3"))
                ),
                null
        );

        OrderCreatedDto result = customerOrderService.createOnlineOrder(request, customer);

        assertThat(result).isNotNull();
        assertThat(result.total()).isEqualByComparingTo("500.00");
    }

    // ------------------------------------------------------------------
    // Fixtures
    // ------------------------------------------------------------------

    private User customer() {
        return new User(null, "c@lembas.com", "hash", "Test", "Customer", "+54 351 123", Role.CUSTOMER);
    }

    private Branch branch() {
        try {
            var ctor = Branch.class.getDeclaredConstructor();
            ctor.setAccessible(true);
            Branch branch = ctor.newInstance();
            setField(branch, "id", 1L);
            setField(branch, "name", "Centro");
            setField(branch, "active", true);
            return branch;
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }

    private static void setField(Object target, String fieldName, Object value) throws ReflectiveOperationException {
        var field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }

    private Product product(String name) {
        var category = new com.dietetica.lembas.catalog.model.Category("Test", null);
        Product product = new Product();
        product.setId(1L);
        product.setCategory(category);
        product.setName(name);
        product.setSalePrice(new BigDecimal("100.00"));
        product.setOnlineStatus(ProductOnlineStatus.PUBLISHED);
        product.setActive(true);
        return product;
    }
}
