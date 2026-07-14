package com.dietetica.lembas.orders.service;

import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.orders.dto.CreateOnlineOrderItemRequest;
import com.dietetica.lembas.orders.dto.CreateOnlineOrderRequest;
import com.dietetica.lembas.orders.dto.OrderCreatedDto;
import com.dietetica.lembas.orders.dto.OrderDetailDto;
import com.dietetica.lembas.orders.dto.OrderSummaryDto;
import com.dietetica.lembas.orders.model.FulfillmentType;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderItem;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.orders.repository.OrderRepository;
import com.dietetica.lembas.payments.model.Payment;
import com.dietetica.lembas.payments.model.PaymentMethod;
import com.dietetica.lembas.payments.model.PaymentProvider;
import com.dietetica.lembas.payments.model.PaymentStatus;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Customer-facing use cases for online orders. */
@Service
public class CustomerOrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final BranchRepository branchRepository;
    private final StockLotRepository stockLotRepository;
    private final OrderNumberGenerator orderNumberGenerator;
    private final OrderMapper orderMapper;

    public CustomerOrderService(
            OrderRepository orderRepository,
            ProductRepository productRepository,
            BranchRepository branchRepository,
            StockLotRepository stockLotRepository,
            OrderNumberGenerator orderNumberGenerator,
            OrderMapper orderMapper
    ) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.branchRepository = branchRepository;
        this.stockLotRepository = stockLotRepository;
        this.orderNumberGenerator = orderNumberGenerator;
        this.orderMapper = orderMapper;
    }

    /** Creates an ONLINE order in PENDING_PAYMENT without reserving or deducting stock. */
    @Transactional
    public OrderCreatedDto createOnlineOrder(CreateOnlineOrderRequest request, User customer) {
        validateCustomer(customer);
        Branch branch = branchRepository.findById(request.branchId())
                .filter(Branch::isActive)
                .orElseThrow(() -> new DomainException("BRANCH_NOT_FOUND", HttpStatus.NOT_FOUND, "Branch not found"));

        List<CreateOnlineOrderItemRequest> mergedItems = mergeDuplicateItems(request.items());
        Order order = new Order();
        order.setOrderNumber(orderNumberGenerator.next(OrderType.ONLINE));
        order.setType(OrderType.ONLINE);
        order.setStatus(OrderStatus.PENDING_PAYMENT);
        order.setBranch(branch);
        order.setCustomerUser(customer);
        order.setFulfillmentType(FulfillmentType.PICKUP);
        order.setCustomerNameSnapshot(customerFullName(customer));
        order.setCustomerEmailSnapshot(customer.getEmail());
        order.setCustomerPhoneSnapshot(customer.getPhone());
        order.setNotes(normalizeBlank(request.notes()));

        BigDecimal subtotal = BigDecimal.ZERO;
        for (CreateOnlineOrderItemRequest itemRequest : mergedItems) {
            Product product = findPurchasableProduct(itemRequest.productId());
            validateAvailableStock(product, branch, itemRequest.quantity());
            OrderItem item = toOrderItem(product, itemRequest.quantity());
            subtotal = subtotal.add(item.getSubtotalAmount());
            order.addItem(item);
        }

        order.setSubtotal(money(subtotal));
        order.setDiscountTotal(BigDecimal.ZERO.setScale(2));
        order.setTotal(money(subtotal));
        order.addPayment(createPendingMercadoPagoPayment(order.getTotal()));

        Order saved = orderRepository.save(order);
        return new OrderCreatedDto(saved.getId(), saved.getOrderNumber(), saved.getStatus(), saved.getTotal());
    }

    /** Returns an order detail only when it belongs to the authenticated customer. */
    @Transactional(readOnly = true)
    public OrderDetailDto getCustomerOrder(Long orderId, User customer) {
        validateCustomer(customer);
        Order order = orderRepository.findWithItemsById(orderId)
                .filter(candidate -> candidate.getCustomerUser() != null
                        && candidate.getCustomerUser().getId().equals(customer.getId()))
                .orElseThrow(() -> new DomainException("ORDER_NOT_FOUND", HttpStatus.NOT_FOUND, "Order not found"));
        return orderMapper.toDetailDto(order);
    }

    /** Returns the authenticated customer's own orders, newest first. */
    @Transactional(readOnly = true)
    public List<OrderSummaryDto> listCustomerOrders(User customer) {
        validateCustomer(customer);
        return orderRepository.findByCustomerUserIdOrderByCreatedAtDesc(customer.getId())
                .stream()
                .map(orderMapper::toSummaryDto)
                .toList();
    }

    /** Coalesces duplicated product lines while preserving first-seen ordering. */
    private List<CreateOnlineOrderItemRequest> mergeDuplicateItems(List<CreateOnlineOrderItemRequest> items) {
        Map<Long, BigDecimal> quantitiesByProduct = new LinkedHashMap<>();
        for (CreateOnlineOrderItemRequest item : items) {
            quantitiesByProduct.merge(item.productId(), item.quantity(), BigDecimal::add);
        }
        return quantitiesByProduct.entrySet().stream()
                .map(entry -> new CreateOnlineOrderItemRequest(entry.getKey(), entry.getValue()))
                .toList();
    }

    /** Finds an active, published product or raises the public API error. */
    private Product findPurchasableProduct(Long productId) {
        return productRepository.findByIdAndActiveTrueAndOnlineStatus(productId, ProductOnlineStatus.PUBLISHED)
                .orElseThrow(() -> new DomainException("PRODUCT_NOT_FOUND", HttpStatus.NOT_FOUND, "Product not found"));
    }

    /** Validates the selected branch has enough current physical stock for the requested line. */
    private void validateAvailableStock(Product product, Branch branch, BigDecimal requestedQuantity) {
        BigDecimal available = stockLotRepository.calculateAvailableQuantity(product.getId(), branch.getId());
        if (available.compareTo(requestedQuantity) < 0) {
            throw new DomainException(
                    "INSUFFICIENT_STOCK",
                    HttpStatus.CONFLICT,
                    "Insufficient stock for product " + product.getName()
            );
        }
    }

    /** Captures immutable product and price snapshots for one order line. */
    private OrderItem toOrderItem(Product product, BigDecimal quantity) {
        BigDecimal unitPrice = money(product.getSalePrice());
        BigDecimal subtotal = money(quantity.multiply(unitPrice));
        OrderItem item = new OrderItem();
        item.setProduct(product);
        item.setQuantity(quantity.setScale(3, RoundingMode.HALF_UP));
        item.setUnitPrice(unitPrice);
        item.setDiscountAmount(BigDecimal.ZERO.setScale(2));
        item.setSubtotalAmount(subtotal);
        item.setProductNameSnapshot(product.getName());
        item.setProductBarcodeSnapshot(product.getBarcode());
        item.setCategoryIdSnapshot(product.getCategory() == null ? null : product.getCategory().getId());
        item.setCategoryNameSnapshot(product.getCategory() == null ? null : product.getCategory().getName());
        item.setCostPriceSnapshot(null);
        return item;
    }

    /** Creates the initial pending online payment required by the payment rules. */
    private Payment createPendingMercadoPagoPayment(BigDecimal amount) {
        Payment payment = new Payment();
        payment.setProvider(PaymentProvider.MERCADO_PAGO);
        payment.setMethod(PaymentMethod.CHECKOUT_PRO);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setAmount(amount);
        payment.setCurrency("ARS");
        return payment;
    }

    /** Ensures customer-only endpoints are not used by internal roles. */
    private void validateCustomer(User user) {
        if (user == null || user.getRole() != Role.CUSTOMER) {
            throw new DomainException("ACCESS_DENIED", HttpStatus.FORBIDDEN, "Only customers can create online orders");
        }
    }

    private static BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private static String customerFullName(User user) {
        String firstName = user.getFirstName() == null ? "" : user.getFirstName().trim();
        String lastName = user.getLastName() == null ? "" : user.getLastName().trim();
        String fullName = (firstName + " " + lastName).trim();
        return fullName.isBlank() ? user.getEmail() : fullName;
    }

    private static String normalizeBlank(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
