package com.dietetica.lembas.inventory.application;

import com.dietetica.lembas.catalog.api.ProductLookup;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.inventory.api.PurchaseReceiptEntryCommand;
import com.dietetica.lembas.inventory.api.PurchaseReceiptEntryRequest;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.inventory.model.StockMovement;
import com.dietetica.lembas.inventory.model.StockMovementType;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.inventory.repository.StockMovementRepository;
import com.dietetica.lembas.shared.branch.api.BranchQuery;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.exception.DomainException;
import java.math.BigDecimal;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Inventory-owned use case for the stock effects of a confirmed purchase receipt item. */
@Service
public class PurchaseReceiptEntryService implements PurchaseReceiptEntryCommand {

    private final StockLotRepository stockLotRepository;
    private final StockMovementRepository stockMovementRepository;
    private final ProductLookup productLookup;
    private final BranchQuery branchQuery;

    public PurchaseReceiptEntryService(
            StockLotRepository stockLotRepository,
            StockMovementRepository stockMovementRepository,
            ProductLookup productLookup,
            BranchQuery branchQuery) {
        this.stockLotRepository = stockLotRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.productLookup = productLookup;
        this.branchQuery = branchQuery;
    }

    /** {@inheritDoc} */
    @Override
    @Transactional
    public Long createPurchaseReceiptEntry(PurchaseReceiptEntryRequest request) {
        Product product = productLookup
                .findById(request.productId())
                .orElseThrow(() -> new DomainException(
                        "PRODUCT_NOT_FOUND", HttpStatus.NOT_FOUND, "Purchase receipt product not found"));
        Branch branch = branchQuery
                .findById(request.branchId())
                .orElseThrow(() -> new DomainException(
                        "BRANCH_NOT_FOUND", HttpStatus.NOT_FOUND, "Purchase receipt branch not found"));

        StockLot lot = new StockLot();
        lot.setProduct(product);
        lot.setBranch(branch);
        lot.setInitialQuantity(request.quantity());
        lot.setQuantityAvailable(request.quantity());
        lot.setSupplierId(request.supplierId());
        lot.setSupplierProductId(request.supplierProductId());
        lot.setPurchaseReceiptId(request.purchaseReceiptId());
        lot.setPurchaseReceiptItemId(request.purchaseReceiptItemId());
        lot.setLotCode(normalizeBlank(request.lotCode()));
        lot.setExpirationDate(request.expirationDate());
        lot.setCostPrice(request.unitCost());
        lot.setUnitCost(request.unitCost() == null ? BigDecimal.ZERO : request.unitCost());

        StockLot savedLot = stockLotRepository.save(lot);
        stockMovementRepository.save(purchaseEntryMovement(savedLot, product, branch, request));
        return savedLot.getId();
    }

    private StockMovement purchaseEntryMovement(
            StockLot lot, Product product, Branch branch, PurchaseReceiptEntryRequest request) {
        StockMovement movement = new StockMovement();
        movement.setStockLot(lot);
        movement.setProduct(product);
        movement.setBranch(branch);
        movement.setType(StockMovementType.PURCHASE_ENTRY);
        movement.setQuantity(request.quantity());
        movement.setUnitCostSnapshot(request.unitCost());
        movement.setReferenceType("PURCHASE_RECEIPT_ITEM");
        movement.setReferenceId(request.purchaseReceiptItemId());
        movement.setCreatedByUserId(request.receivedByUserId());
        movement.setReason("Purchase receipt confirmation");
        return movement;
    }

    private String normalizeBlank(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
