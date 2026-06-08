package com.dietetica.lembas.suppliers.service;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.inventory.model.StockMovement;
import com.dietetica.lembas.inventory.model.StockMovementType;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.inventory.repository.StockMovementRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.suppliers.dto.PurchaseReceiptDto;
import com.dietetica.lembas.suppliers.dto.PurchaseReceiptItemDto;
import com.dietetica.lembas.suppliers.dto.PurchaseReceiptItemRequest;
import com.dietetica.lembas.suppliers.dto.PurchaseReceiptRequest;
import com.dietetica.lembas.suppliers.model.PurchaseOrder;
import com.dietetica.lembas.suppliers.model.PurchaseOrderItem;
import com.dietetica.lembas.suppliers.model.PurchaseOrderStatus;
import com.dietetica.lembas.suppliers.model.PurchaseReceipt;
import com.dietetica.lembas.suppliers.model.PurchaseReceiptItem;
import com.dietetica.lembas.suppliers.model.PurchaseReceiptStatus;
import com.dietetica.lembas.suppliers.repository.PurchaseOrderRepository;
import com.dietetica.lembas.suppliers.repository.PurchaseReceiptItemRepository;
import com.dietetica.lembas.suppliers.repository.PurchaseReceiptRepository;
import com.dietetica.lembas.users.model.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Application service that confirms purchase receipts and generates stock atomically. */
@Service
public class PurchaseReceiptService {
    private static final Set<PurchaseOrderStatus> RECEIVABLE_STATUSES = Set.of(
            PurchaseOrderStatus.SENT,
            PurchaseOrderStatus.PARTIALLY_RECEIVED
    );

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseReceiptRepository purchaseReceiptRepository;
    private final PurchaseReceiptItemRepository purchaseReceiptItemRepository;
    private final StockLotRepository stockLotRepository;
    private final StockMovementRepository stockMovementRepository;
    private final SecurityContextHelper securityContextHelper;

    public PurchaseReceiptService(
            PurchaseOrderRepository purchaseOrderRepository,
            PurchaseReceiptRepository purchaseReceiptRepository,
            PurchaseReceiptItemRepository purchaseReceiptItemRepository,
            StockLotRepository stockLotRepository,
            StockMovementRepository stockMovementRepository,
            SecurityContextHelper securityContextHelper
    ) {
        this.purchaseOrderRepository = purchaseOrderRepository;
        this.purchaseReceiptRepository = purchaseReceiptRepository;
        this.purchaseReceiptItemRepository = purchaseReceiptItemRepository;
        this.stockLotRepository = stockLotRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.securityContextHelper = securityContextHelper;
    }

    /** Confirms a purchase receipt, creates stock lots, creates PURCHASE_ENTRY movements, and updates the order state. */
    @Transactional
    public PurchaseReceiptDto confirm(PurchaseReceiptRequest request) {
        PurchaseOrder order = purchaseOrderRepository.findWithItemsById(request.purchaseOrderId())
                .orElseThrow(() -> new DomainException("PURCHASE_ORDER_NOT_FOUND", HttpStatus.NOT_FOUND, "Purchase order not found"));
        ensureReceivable(order);

        Map<Long, PurchaseOrderItem> orderItems = orderItemsById(order);
        validateReceiptItems(request.items(), orderItems);

        User currentUser = currentUserOrNull();
        PurchaseReceipt receipt = new PurchaseReceipt();
        receipt.setPurchaseOrder(order);
        receipt.setSupplier(order.getSupplier());
        receipt.setBranch(order.getBranch());
        receipt.setStatus(PurchaseReceiptStatus.CONFIRMED);
        receipt.setInvoiceNumber(normalizeBlank(request.invoiceNumber()));
        receipt.setNotes(normalizeBlank(request.notes()));
        receipt.setReceivedByUser(currentUser);
        receipt.setReceivedAt(OffsetDateTime.now());
        receipt.setConfirmedAt(OffsetDateTime.now());

        for (PurchaseReceiptItemRequest itemRequest : request.items()) {
            PurchaseOrderItem orderItem = orderItems.get(itemRequest.purchaseOrderItemId());
            PurchaseReceiptItem item = new PurchaseReceiptItem();
            item.setPurchaseOrderItem(orderItem);
            item.setProduct(orderItem.getProduct());
            item.setSupplierProduct(orderItem.getSupplierProduct());
            item.setQuantityReceived(itemRequest.quantityReceived());
            item.setUnitCost(itemRequest.unitCost());
            item.setLotCode(normalizeBlank(itemRequest.lotCode()));
            item.setExpirationDate(itemRequest.expirationDate());
            receipt.addItem(item);
        }

        PurchaseReceipt savedReceipt = purchaseReceiptRepository.saveAndFlush(receipt);
        for (PurchaseReceiptItem item : savedReceipt.getItems()) {
            StockLot lot = createStockLot(savedReceipt, item);
            item.setCreatedStockLotId(lot.getId());
            stockMovementRepository.save(purchaseEntryMovement(savedReceipt, item, lot, currentUser));
        }

        order.setStatus(resolveOrderStatus(order));
        return toDto(savedReceipt, order.getStatus());
    }

    /** Validates that the purchase order can still receive merchandise. */
    private void ensureReceivable(PurchaseOrder order) {
        if (!RECEIVABLE_STATUSES.contains(order.getStatus())) {
            throw new DomainException(
                    "PURCHASE_RECEIPT_INVALID_STATE",
                    HttpStatus.CONFLICT,
                    "Only sent or partially received purchase orders can be received"
            );
        }
        if (order.getItems().isEmpty()) {
            throw new DomainException("PURCHASE_ORDER_EMPTY", HttpStatus.BAD_REQUEST, "Purchase order must contain items");
        }
    }

    /** Ensures every requested item belongs to the order and does not over-receive. */
    private void validateReceiptItems(List<PurchaseReceiptItemRequest> requests, Map<Long, PurchaseOrderItem> orderItems) {
        Set<Long> seenItems = new java.util.HashSet<>();
        for (PurchaseReceiptItemRequest request : requests) {
            PurchaseOrderItem orderItem = orderItems.get(request.purchaseOrderItemId());
            if (orderItem == null) {
                throw new DomainException("PURCHASE_RECEIPT_ITEM_INVALID", HttpStatus.BAD_REQUEST, "Receipt item does not belong to the purchase order");
            }
            if (!seenItems.add(request.purchaseOrderItemId())) {
                throw new DomainException("PURCHASE_RECEIPT_ITEM_DUPLICATED", HttpStatus.BAD_REQUEST, "Receipt item is duplicated");
            }
            BigDecimal alreadyReceived = purchaseReceiptItemRepository.sumConfirmedQuantityByPurchaseOrderItemId(orderItem.getId());
            BigDecimal requestedTotal = alreadyReceived.add(request.quantityReceived());
            if (requestedTotal.compareTo(orderItem.getQuantityOrdered()) > 0) {
                throw new DomainException("PURCHASE_RECEIPT_OVER_RECEIVED", HttpStatus.CONFLICT, "Received quantity exceeds ordered quantity");
            }
        }
    }

    /** Creates one stock lot from one confirmed purchase receipt item. */
    private StockLot createStockLot(PurchaseReceipt receipt, PurchaseReceiptItem item) {
        StockLot lot = new StockLot();
        lot.setProduct(item.getProduct());
        lot.setBranch(receipt.getBranch());
        lot.setInitialQuantity(item.getQuantityReceived());
        lot.setQuantityAvailable(item.getQuantityReceived());
        lot.setSupplierId(receipt.getSupplier().getId());
        lot.setSupplierProductId(item.getSupplierProduct() == null ? null : item.getSupplierProduct().getId());
        lot.setPurchaseReceiptId(receipt.getId());
        lot.setPurchaseReceiptItemId(item.getId());
        lot.setLotCode(item.getLotCode());
        lot.setExpirationDate(item.getExpirationDate());
        lot.setCostPrice(item.getUnitCost());
        lot.setUnitCost(item.getUnitCost());
        return stockLotRepository.save(lot);
    }

    /** Builds the immutable stock movement produced by a confirmed receipt item. */
    private StockMovement purchaseEntryMovement(PurchaseReceipt receipt, PurchaseReceiptItem item, StockLot lot, User currentUser) {
        StockMovement movement = new StockMovement();
        movement.setStockLot(lot);
        movement.setProduct(item.getProduct());
        movement.setBranch(receipt.getBranch());
        movement.setType(StockMovementType.PURCHASE_ENTRY);
        movement.setQuantity(item.getQuantityReceived());
        movement.setUnitCostSnapshot(item.getUnitCost());
        movement.setReferenceType("PURCHASE_RECEIPT_ITEM");
        movement.setReferenceId(item.getId());
        movement.setCreatedByUserId(currentUser == null ? null : currentUser.getId());
        movement.setReason("Purchase receipt confirmation");
        return movement;
    }

    /** Resolves whether the order is fully or partially received after the new receipt. */
    private PurchaseOrderStatus resolveOrderStatus(PurchaseOrder order) {
        for (PurchaseOrderItem item : order.getItems()) {
            BigDecimal received = purchaseReceiptItemRepository.sumConfirmedQuantityByPurchaseOrderItemId(item.getId());
            if (received.compareTo(item.getQuantityOrdered()) < 0) {
                return PurchaseOrderStatus.PARTIALLY_RECEIVED;
            }
        }
        return PurchaseOrderStatus.RECEIVED;
    }

    /** Maps order item ids to entities for receipt validation. */
    private Map<Long, PurchaseOrderItem> orderItemsById(PurchaseOrder order) {
        Map<Long, PurchaseOrderItem> items = new HashMap<>();
        for (PurchaseOrderItem item : order.getItems()) {
            items.put(item.getId(), item);
        }
        return items;
    }

    /** Maps a confirmed receipt aggregate to the stable API response. */
    private PurchaseReceiptDto toDto(PurchaseReceipt receipt, PurchaseOrderStatus orderStatus) {
        BigDecimal totalQuantity = receipt.getItems().stream()
                .map(PurchaseReceiptItem::getQuantityReceived)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new PurchaseReceiptDto(
                receipt.getId(),
                receipt.getPurchaseOrder().getId(),
                receipt.getSupplier().getId(),
                receipt.getSupplier().getName(),
                receipt.getBranch().getId(),
                receipt.getBranch().getName(),
                receipt.getStatus().name(),
                receipt.getInvoiceNumber(),
                receipt.getReceivedAt(),
                receipt.getConfirmedAt(),
                orderStatus.name(),
                totalQuantity,
                receipt.getItems().stream().map(this::toItemDto).toList()
        );
    }

    /** Maps a confirmed receipt item to the API response. */
    private PurchaseReceiptItemDto toItemDto(PurchaseReceiptItem item) {
        return new PurchaseReceiptItemDto(
                item.getId(),
                item.getPurchaseOrderItem() == null ? null : item.getPurchaseOrderItem().getId(),
                item.getProduct().getId(),
                item.getProduct().getName(),
                item.getQuantityReceived(),
                item.getUnitCost(),
                item.getLotCode(),
                item.getExpirationDate(),
                item.getCreatedStockLotId()
        );
    }

    /** Reads the current user when available; tests without security can still exercise business rules. */
    private User currentUserOrNull() {
        try {
            return securityContextHelper.getCurrentUser();
        } catch (IllegalStateException ignored) {
            return null;
        }
    }

    /** Converts blank optional text to null before persistence. */
    private String normalizeBlank(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
