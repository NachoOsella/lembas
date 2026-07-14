package com.dietetica.lembas.suppliers.service;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.suppliers.dto.PurchaseOrderDetailDto;
import com.dietetica.lembas.suppliers.dto.PurchaseOrderItemDto;
import com.dietetica.lembas.suppliers.dto.PurchaseOrderItemRequest;
import com.dietetica.lembas.suppliers.dto.PurchaseOrderRequest;
import com.dietetica.lembas.suppliers.dto.PurchaseOrderSummaryDto;
import com.dietetica.lembas.suppliers.model.PurchaseOrder;
import com.dietetica.lembas.suppliers.model.PurchaseOrderItem;
import com.dietetica.lembas.suppliers.model.PurchaseOrderStatus;
import com.dietetica.lembas.suppliers.model.Supplier;
import com.dietetica.lembas.suppliers.model.SupplierProduct;
import com.dietetica.lembas.suppliers.repository.PurchaseOrderRepository;
import com.dietetica.lembas.suppliers.repository.SupplierProductRepository;
import com.dietetica.lembas.suppliers.repository.SupplierRepository;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

/** Application service for supplier purchase orders and state transitions. */
@Service
public class PurchaseOrderService {
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SupplierRepository supplierRepository;
    private final SupplierProductRepository supplierProductRepository;
    private final BranchRepository branchRepository;
    private final SecurityContextHelper securityContextHelper;

    public PurchaseOrderService(
            PurchaseOrderRepository purchaseOrderRepository,
            SupplierRepository supplierRepository,
            SupplierProductRepository supplierProductRepository,
            BranchRepository branchRepository,
            SecurityContextHelper securityContextHelper
    ) {
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.supplierRepository = supplierRepository;
        this.supplierProductRepository = supplierProductRepository;
        this.branchRepository = branchRepository;
        this.securityContextHelper = securityContextHelper;
    }

    /** Lists purchase orders with optional supplier, branch, and status filters. */
    @Transactional(readOnly = true)
    public Page<PurchaseOrderSummaryDto> list(Long supplierId, Long branchId, PurchaseOrderStatus status, Pageable pageable) {
        Long effectiveBranchId = resolveBranchForUser(branchId);
        return purchaseOrderRepository.search(supplierId, effectiveBranchId, status, mapSort(pageable)).map(this::toSummaryDto);
    }

    /** Returns a detailed purchase order for view, edit, or PDF preview. */
    @Transactional(readOnly = true)
    public PurchaseOrderDetailDto get(Long id) {
        PurchaseOrder order = findOrder(id);
        ensureBranchAccess(order);
        return toDetailDto(order);
    }

    /** Creates a draft purchase order and snapshots item costs. */
    @Transactional
    public PurchaseOrderDetailDto create(PurchaseOrderRequest request) {
        Supplier supplier = findSupplier(request.supplierId());
        Branch branch = findBranch(request.branchId());
        PurchaseOrder order = new PurchaseOrder();
        order.setSupplier(supplier);
        order.setBranch(branch);
        order.setStatus(PurchaseOrderStatus.DRAFT);
        order.setExpectedDeliveryDate(request.expectedDeliveryDate());
        order.setNotes(normalizeBlank(request.notes()));
        order.setCreatedByUser(currentUserOrNull());
        order.replaceItems(buildItems(supplier.getId(), request.items()));
        return toDetailDto(purchaseOrderRepository.save(order));
    }

    /** Updates an existing draft purchase order. */
    @Transactional
    public PurchaseOrderDetailDto update(Long id, PurchaseOrderRequest request) {
        PurchaseOrder order = findOrder(id);
        ensureState(order, PurchaseOrderStatus.DRAFT, "Only draft purchase orders can be edited");
        Supplier supplier = findSupplier(request.supplierId());
        Branch branch = findBranch(request.branchId());
        order.setSupplier(supplier);
        order.setBranch(branch);
        order.setExpectedDeliveryDate(request.expectedDeliveryDate());
        order.setNotes(normalizeBlank(request.notes()));
        order.replaceItems(buildItems(supplier.getId(), request.items()));
        return toDetailDto(order);
    }

    /** Confirms a draft purchase order without modifying stock. */
    @Transactional
    public PurchaseOrderDetailDto confirm(Long id) {
        PurchaseOrder order = findOrder(id);
        ensureState(order, PurchaseOrderStatus.DRAFT, "Only draft purchase orders can be confirmed");
        ensureHasItems(order);
        order.setStatus(PurchaseOrderStatus.CONFIRMED);
        order.setConfirmedAt(OffsetDateTime.now());
        return toDetailDto(order);
    }

    /** Marks a confirmed purchase order as sent to the supplier. */
    @Transactional
    public PurchaseOrderDetailDto send(Long id) {
        PurchaseOrder order = findOrder(id);
        ensureState(order, PurchaseOrderStatus.CONFIRMED, "Only confirmed purchase orders can be sent");
        order.setStatus(PurchaseOrderStatus.SENT);
        order.setSentAt(OffsetDateTime.now());
        return toDetailDto(order);
    }

    /** Cancels a purchase order before reception starts. */
    @Transactional
    public PurchaseOrderDetailDto cancel(Long id, String reason) {
        PurchaseOrder order = findOrder(id);
        if (order.getStatus() == PurchaseOrderStatus.CANCELLED
                || order.getStatus() == PurchaseOrderStatus.PARTIALLY_RECEIVED
                || order.getStatus() == PurchaseOrderStatus.RECEIVED) {
            throw invalidState("Purchase order cannot be cancelled in its current state");
        }
        order.setStatus(PurchaseOrderStatus.CANCELLED);
        order.setCancellationReason(normalizeBlank(reason));
        order.setCancelledAt(OffsetDateTime.now());
        return toDetailDto(order);
    }

    /** Loads an order entity with all associations required by the PDF service. */
    @Transactional(readOnly = true)
    public PurchaseOrder getForPdf(Long id) {
        return findOrder(id);
    }

    /** Builds purchase order items, preloading current supplier costs when unit cost is omitted. */
    private List<PurchaseOrderItem> buildItems(Long supplierId, List<PurchaseOrderItemRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            throw new DomainException("PURCHASE_ORDER_EMPTY", HttpStatus.BAD_REQUEST, "Purchase order must contain at least one item");
        }
        List<PurchaseOrderItem> items = new ArrayList<>();
        for (PurchaseOrderItemRequest request : requests) {
            SupplierProduct supplierProduct = supplierProductRepository.findByIdAndActiveTrue(request.supplierProductId())
                    .orElseThrow(() -> new DomainException("SUPPLIER_PRODUCT_NOT_FOUND", HttpStatus.NOT_FOUND, "Supplier product not found"));
            if (!supplierProduct.getSupplier().getId().equals(supplierId)) {
                throw new DomainException("PURCHASE_ORDER_SUPPLIER_PRODUCT_INVALID", HttpStatus.CONFLICT, "Product is not associated with the selected supplier");
            }
            BigDecimal unitCost = request.unitCost() == null ? supplierProduct.getCurrentCost() : request.unitCost();
            PurchaseOrderItem item = new PurchaseOrderItem();
            item.setProduct(supplierProduct.getProduct());
            item.setSupplierProduct(supplierProduct);
            item.setQuantityOrdered(request.quantityOrdered());
            item.setUnitCost(unitCost);
            item.setSubtotal(calculateSubtotal(request.quantityOrdered(), unitCost));
            items.add(item);
        }
        return items;
    }

    /** Calculates a money subtotal with the standard two decimal scale. */
    private BigDecimal calculateSubtotal(BigDecimal quantity, BigDecimal unitCost) {
        return quantity.multiply(unitCost).setScale(2, RoundingMode.HALF_UP);
    }

    /** Computes the total from immutable item subtotals. */
    private BigDecimal calculateTotal(PurchaseOrder order) {
        return order.getItems().stream()
                .map(PurchaseOrderItem::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    /** Finds an active supplier or throws the standard API error. */
    private Supplier findSupplier(Long id) {
        return supplierRepository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new DomainException("SUPPLIER_NOT_FOUND", HttpStatus.NOT_FOUND, "Supplier not found"));
    }

    /** Finds an active branch or throws the standard API error. */
    private Branch findBranch(Long id) {
        return branchRepository.findById(id)
                .filter(Branch::isActive)
                .orElseThrow(() -> new DomainException("BRANCH_NOT_FOUND", HttpStatus.NOT_FOUND, "Branch not found"));
    }

    /** Finds a purchase order with required associations or throws a domain error. */
    private PurchaseOrder findOrder(Long id) {
        return purchaseOrderRepository.findWithItemsById(id)
                .orElseThrow(() -> new DomainException("PURCHASE_ORDER_NOT_FOUND", HttpStatus.NOT_FOUND, "Purchase order not found"));
    }

    /** Restricts branch-scoped staff to purchase orders for their assigned branch. */
    private void ensureBranchAccess(PurchaseOrder order) {
        User currentUser = currentUserOrNull();
        if (currentUser == null || currentUser.getRole() == null || currentUser.getRole() == Role.ADMIN) {
            return;
        }
        if (currentUser.getBranchId() == null
                || order.getBranch() == null
                || !currentUser.getBranchId().equals(order.getBranch().getId())) {
            throw new DomainException("ACCESS_DENIED", HttpStatus.FORBIDDEN,
                    "Purchase order belongs to another branch");
        }
    }

    /** Resolves branch filters for the current role without leaking other branches. */
    private Long resolveBranchForUser(Long requestedBranchId) {
        User currentUser = currentUserOrNull();
        if (currentUser == null || currentUser.getRole() == Role.ADMIN) {
            return requestedBranchId;
        }
        if (currentUser.getBranchId() == null) {
            throw new DomainException("INVALID_USER_BRANCH", HttpStatus.BAD_REQUEST,
                    "User has no assigned branch");
        }
        return currentUser.getBranchId();
    }

    /** Validates the exact expected state for a transition. */
    private void ensureState(PurchaseOrder order, PurchaseOrderStatus expected, String message) {
        if (order.getStatus() != expected) {
            throw invalidState(message);
        }
    }

    /** Validates the order still has lines before confirmation. */
    private void ensureHasItems(PurchaseOrder order) {
        if (order.getItems().isEmpty()) {
            throw new DomainException("PURCHASE_ORDER_EMPTY", HttpStatus.BAD_REQUEST, "Purchase order must contain at least one item");
        }
    }

    /** Creates the uniform invalid-state domain exception. */
    private DomainException invalidState(String message) {
        return new DomainException("PURCHASE_ORDER_INVALID_STATE", HttpStatus.CONFLICT, message);
    }

    /** Reads the current user when available; tests without a principal can still exercise business logic. */
    private User currentUserOrNull() {
        try {
            return securityContextHelper.getCurrentUser();
        } catch (IllegalStateException ignored) {
            return null;
        }
    }

    /** Maps sortable DTO fields to entity paths. */
    private Pageable mapSort(Pageable pageable) {
        if (pageable.getSort().isUnsorted()) {
            return pageable;
        }
        Sort mapped = Sort.unsorted();
        for (Sort.Order order : pageable.getSort()) {
            String property = switch (order.getProperty()) {
                case "supplierName" -> "supplier.name";
                case "branchName" -> "branch.name";
                default -> order.getProperty();
            };
            mapped = mapped.and(Sort.by(new Sort.Order(order.getDirection(), property)));
        }
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), mapped);
    }

    /** Converts blank optional text to null. */
    private String normalizeBlank(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    /** Maps an order to a list row DTO. */
    private PurchaseOrderSummaryDto toSummaryDto(PurchaseOrder order) {
        return new PurchaseOrderSummaryDto(
                order.getId(),
                order.getSupplier().getId(),
                order.getSupplier().getName(),
                order.getBranch().getId(),
                order.getBranch().getName(),
                order.getStatus().name(),
                order.getOrderDate(),
                order.getExpectedDeliveryDate(),
                calculateTotal(order),
                order.getItems().size(),
                order.getCreatedAt()
        );
    }

    /** Maps an order to a detailed DTO. */
    private PurchaseOrderDetailDto toDetailDto(PurchaseOrder order) {
        Supplier supplier = order.getSupplier();
        return new PurchaseOrderDetailDto(
                order.getId(),
                supplier.getId(),
                supplier.getName(),
                supplier.getPhone(),
                supplier.getEmail(),
                supplier.getCuit(),
                order.getBranch().getId(),
                order.getBranch().getName(),
                order.getStatus().name(),
                order.getOrderDate(),
                order.getExpectedDeliveryDate(),
                order.getNotes(),
                calculateTotal(order),
                order.getItems().stream().map(this::toItemDto).toList(),
                order.getCreatedAt(),
                order.getConfirmedAt(),
                order.getSentAt(),
                order.getCancelledAt(),
                order.getCancellationReason()
        );
    }

    /** Maps an order item to its DTO. */
    private PurchaseOrderItemDto toItemDto(PurchaseOrderItem item) {
        return new PurchaseOrderItemDto(
                item.getId(),
                item.getProduct().getId(),
                item.getProduct().getName(),
                item.getProduct().getBarcode(),
                item.getSupplierProduct() == null ? null : item.getSupplierProduct().getId(),
                item.getSupplierProduct() == null ? null : item.getSupplierProduct().getSupplierSku(),
                item.getQuantityOrdered(),
                item.getUnitCost(),
                item.getSubtotal()
        );
    }
}
