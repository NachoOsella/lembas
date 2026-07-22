package com.dietetica.lembas.suppliers.service;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.catalog.api.SupplierPricingCatalog;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.suppliers.dto.PriceUpdateBatchDefaultsRequest;
import com.dietetica.lembas.suppliers.dto.PriceUpdateBatchDetailDto;
import com.dietetica.lembas.suppliers.dto.PriceUpdateBatchItemDto;
import com.dietetica.lembas.suppliers.dto.PriceUpdateBatchItemUpdateRequest;
import com.dietetica.lembas.suppliers.dto.PriceUpdateBatchSummaryDto;
import com.dietetica.lembas.suppliers.dto.PriceUpdateManualBatchRequest;
import com.dietetica.lembas.suppliers.dto.PriceUpdateManualItemRequest;
import com.dietetica.lembas.suppliers.model.PriceUpdateBatch;
import com.dietetica.lembas.suppliers.model.PriceUpdateBatchItem;
import com.dietetica.lembas.suppliers.model.PriceUpdateBatchItemStatus;
import com.dietetica.lembas.suppliers.model.PriceUpdateBatchStatus;
import com.dietetica.lembas.suppliers.model.PriceUpdateBatchType;
import com.dietetica.lembas.suppliers.model.Supplier;
import com.dietetica.lembas.suppliers.model.SupplierProduct;
import com.dietetica.lembas.suppliers.model.SupplierProductCostHistory;
import com.dietetica.lembas.suppliers.repository.PriceUpdateBatchItemRepository;
import com.dietetica.lembas.suppliers.repository.PriceUpdateBatchRepository;
import com.dietetica.lembas.suppliers.repository.SupplierProductCostHistoryRepository;
import com.dietetica.lembas.suppliers.repository.SupplierProductRepository;
import com.dietetica.lembas.suppliers.repository.SupplierRepository;
import com.dietetica.lembas.users.model.User;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/** Application service for reviewed supplier price and catalog update batches. */
@Service
public class PriceUpdateBatchService {
    private static final String SOURCE_PRICE_BATCH = "PRICE_BATCH";
    private static final String REFERENCE_PRICE_BATCH = "PRICE_UPDATE_BATCH";

    private final PriceUpdateBatchRepository batchRepository;
    private final PriceUpdateBatchItemRepository itemRepository;
    private final SupplierRepository supplierRepository;
    private final SupplierProductRepository supplierProductRepository;
    private final SupplierProductCostHistoryRepository costHistoryRepository;
    private final SupplierPricingCatalog supplierPricingCatalog;
    private final PriceUpdateImportService importService;
    private final PriceUpdateCalculationService calculationService;
    private final SecurityContextHelper securityContextHelper;

    public PriceUpdateBatchService(
            PriceUpdateBatchRepository batchRepository,
            PriceUpdateBatchItemRepository itemRepository,
            SupplierRepository supplierRepository,
            SupplierProductRepository supplierProductRepository,
            SupplierProductCostHistoryRepository costHistoryRepository,
            SupplierPricingCatalog supplierPricingCatalog,
            PriceUpdateImportService importService,
            PriceUpdateCalculationService calculationService,
            SecurityContextHelper securityContextHelper) {
        this.batchRepository = batchRepository;
        this.itemRepository = itemRepository;
        this.supplierRepository = supplierRepository;
        this.supplierProductRepository = supplierProductRepository;
        this.costHistoryRepository = costHistoryRepository;
        this.supplierPricingCatalog = supplierPricingCatalog;
        this.importService = importService;
        this.calculationService = calculationService;
        this.securityContextHelper = securityContextHelper;
    }

    /** Lists price update batches with optional supplier and status filters. */
    @Transactional(readOnly = true)
    public Page<PriceUpdateBatchSummaryDto> list(Long supplierId, PriceUpdateBatchStatus status, Pageable pageable) {
        return batchRepository.search(supplierId, status, pageable).map(this::toSummaryDto);
    }

    /** Loads one batch detail for preview and edit screens. */
    @Transactional(readOnly = true)
    public PriceUpdateBatchDetailDto get(Long id) {
        return toDetailDto(findDetailed(id));
    }

    /** Creates a manual-grid batch from explicitly entered rows. */
    @Transactional
    public PriceUpdateBatchDetailDto createManual(PriceUpdateManualBatchRequest request) {
        Supplier supplier = findSupplier(request.supplierId());
        User currentUser = currentUserOrNull();
        PriceUpdateBatch batch =
                createBatch(supplier, PriceUpdateBatchType.MANUAL_GRID, null, request.defaults(), request.notes());
        batch.setCreatedByUser(currentUser);
        for (PriceUpdateManualItemRequest item : request.items()) {
            batch.addItem(buildPreviewItem(
                    batch,
                    new SupplierPriceRow(
                            item.supplierSku(), item.barcode(), item.productName(), item.newCost(), null)));
        }
        return toDetailDto(batchRepository.save(batch));
    }

    /** Creates a supplier-file batch by importing CSV or XLSX rows. */
    @Transactional
    public PriceUpdateBatchDetailDto importFile(
            Long supplierId, PriceUpdateBatchDefaultsRequest defaults, MultipartFile file, String notes) {
        Supplier supplier = findSupplier(supplierId);
        User currentUser = currentUserOrNull();
        List<SupplierPriceRow> rows = importService.parse(file);
        PriceUpdateBatch batch =
                createBatch(supplier, PriceUpdateBatchType.SUPPLIER_FILE, file.getOriginalFilename(), defaults, notes);
        batch.setCreatedByUser(currentUser);
        rows.forEach(row -> batch.addItem(buildPreviewItem(batch, row)));
        return toDetailDto(batchRepository.save(batch));
    }

    /** Updates batch-level defaults and recalculates current preview rows. */
    @Transactional
    public PriceUpdateBatchDetailDto updateDefaults(Long id, PriceUpdateBatchDefaultsRequest request) {
        PriceUpdateBatch batch = findMutableForUpdate(id);
        applyDefaultsRequest(batch, request);
        batch.getItems().forEach(item -> calculationService.calculate(batch, item, false));
        return toDetailDto(batch);
    }

    /** Applies current batch defaults to every row in the preview. */
    @Transactional
    public PriceUpdateBatchDetailDto applyDefaultsToAll(Long id) {
        PriceUpdateBatch batch = findMutableForUpdate(id);
        batch.getItems().forEach(item -> calculationService.applyDefaults(batch, item));
        return toDetailDto(batch);
    }

    /** Updates one preview row with admin overrides. */
    @Transactional
    public PriceUpdateBatchDetailDto updateItem(Long batchId, Long itemId, PriceUpdateBatchItemUpdateRequest request) {
        PriceUpdateBatch batch = findMutableForUpdate(batchId);
        PriceUpdateBatchItem item = batch.getItems().stream()
                .filter(candidate -> Objects.equals(candidate.getId(), itemId))
                .findFirst()
                .orElseThrow(() -> new DomainException(
                        "PRICE_BATCH_ITEM_NOT_FOUND", HttpStatus.NOT_FOUND, "Price update batch item not found"));
        applyItemOverrides(batch, item, request);
        return toDetailDto(batch);
    }

    /** Validates unresolved rows and moves the batch to VALIDATED when it is ready to apply. */
    @Transactional
    public PriceUpdateBatchDetailDto validate(Long id) {
        PriceUpdateBatch batch = findMutableForUpdate(id);
        ensureResolvable(batch);
        batch.setStatus(PriceUpdateBatchStatus.VALIDATED);
        return toDetailDto(batch);
    }

    /** Cancels a draft or validated batch. */
    @Transactional
    public PriceUpdateBatchDetailDto cancel(Long id) {
        PriceUpdateBatch batch = findMutableForUpdate(id);
        batch.setStatus(PriceUpdateBatchStatus.CANCELLED);
        batch.setCancelledAt(OffsetDateTime.now());
        return toDetailDto(batch);
    }

    /** Applies a validated batch transactionally to products, supplier costs, and history tables. */
    @Transactional
    public PriceUpdateBatchDetailDto apply(Long id) {
        PriceUpdateBatch batch = findMutableForUpdate(id);
        ensureResolvable(batch);
        User currentUser = currentUserOrNull();
        for (PriceUpdateBatchItem item : batch.getItems()) {
            if (item.getStatus() == PriceUpdateBatchItemStatus.EXCLUDED
                    || item.getStatus() == PriceUpdateBatchItemStatus.UNCHANGED) {
                continue;
            }
            if (item.getStatus() == PriceUpdateBatchItemStatus.UPDATE) {
                applyExistingItem(batch, item, currentUser);
            } else if (item.getStatus() == PriceUpdateBatchItemStatus.CREATE) {
                applyNewProductItem(batch, item, currentUser);
            }
        }
        batch.setStatus(PriceUpdateBatchStatus.APPLIED);
        batch.setAppliedAt(OffsetDateTime.now());
        return toDetailDto(batch);
    }

    /** Builds a new batch with MVP defaults when the request omits values. */
    private PriceUpdateBatch createBatch(
            Supplier supplier,
            PriceUpdateBatchType type,
            String fileName,
            PriceUpdateBatchDefaultsRequest defaults,
            String notes) {
        PriceUpdateBatch batch = new PriceUpdateBatch();
        batch.setSupplier(supplier);
        batch.setType(type);
        batch.setStatus(PriceUpdateBatchStatus.DRAFT);
        batch.setSourceFileName(fileName);
        batch.setDefaultNewProductMarginPercentage(BigDecimal.valueOf(35));
        batch.setNotes(blankToNull(notes));
        if (defaults != null) {
            applyDefaultsRequest(batch, defaults);
        }
        return batch;
    }

    /** Converts one imported/manual row into a classified and calculated preview item. */
    private PriceUpdateBatchItem buildPreviewItem(PriceUpdateBatch batch, SupplierPriceRow row) {
        PriceUpdateBatchItem item = new PriceUpdateBatchItem();
        item.setSupplierSku(blankToNull(row.supplierSku()));
        item.setBarcode(blankToNull(row.barcode()));
        item.setSupplierProductName(blankToNull(row.productName()));
        item.setNewCost(row.newCost());
        item.setApplyCostUpdate(batch.isApplyCostUpdatesByDefault());
        item.setApplySalePriceUpdate(batch.isApplySalePriceUpdatesByDefault());
        item.setNewProductMarginPercentage(batch.getDefaultNewProductMarginPercentage());
        if (row.hasError()) {
            item.setStatus(PriceUpdateBatchItemStatus.ERROR);
            item.setErrorMessage(row.errorMessage());
            return item;
        }
        matchItem(batch, item);
        calculationService.calculate(batch, item, false);
        if (item.getStatus() == PriceUpdateBatchItemStatus.UNCHANGED && batch.isExcludeUnchangedByDefault()) {
            item.setStatus(PriceUpdateBatchItemStatus.EXCLUDED);
        }
        return item;
    }

    /** Matches a row by supplier SKU, barcode, or normalized product name. */
    private void matchItem(PriceUpdateBatch batch, PriceUpdateBatchItem item) {
        Long supplierId = batch.getSupplier().getId();
        if (item.getSupplierSku() != null) {
            supplierProductRepository
                    .findBySupplierIdAndSupplierSkuIgnoreCaseAndActiveTrue(supplierId, item.getSupplierSku())
                    .ifPresent(supplierProduct -> applySupplierProductMatch(item, supplierProduct));
            if (item.getSupplierProduct() != null) {
                return;
            }
        }
        if (item.getBarcode() != null) {
            supplierPricingCatalog
                    .findActiveProductByBarcode(item.getBarcode())
                    .ifPresent(product -> applyProductMatch(batch, item, product));
            if (item.getProduct() != null) {
                return;
            }
        }
        if (item.getSupplierProductName() != null) {
            List<Product> matches = supplierPricingCatalog.findActiveProductsByExactName(item.getSupplierProductName());
            if (matches.size() == 1) {
                applyProductMatch(batch, item, matches.getFirst());
            } else if (matches.size() > 1) {
                item.setStatus(PriceUpdateBatchItemStatus.REVIEW);
                item.setErrorMessage("Multiple products match this supplier row name");
            } else {
                item.setStatus(PriceUpdateBatchItemStatus.CREATE);
            }
        } else {
            item.setStatus(PriceUpdateBatchItemStatus.REVIEW);
            item.setErrorMessage("Product name is required to create a new product");
        }
    }

    /** Applies a direct supplier-product match to the preview row. */
    private void applySupplierProductMatch(PriceUpdateBatchItem item, SupplierProduct supplierProduct) {
        item.setSupplierProduct(supplierProduct);
        item.setProduct(supplierProduct.getProduct());
        item.setOldCost(supplierProduct.getCurrentCost());
        item.setOldSalePrice(supplierProduct.getProduct().getSalePrice());
        item.setSupplierProductName(defaultIfBlank(
                item.getSupplierProductName(), supplierProduct.getProduct().getName()));
        item.setBarcode(
                defaultIfBlank(item.getBarcode(), supplierProduct.getProduct().getBarcode()));
    }

    /** Applies a product match and links an existing supplier-product association when available. */
    private void applyProductMatch(PriceUpdateBatch batch, PriceUpdateBatchItem item, Product product) {
        item.setProduct(product);
        item.setOldSalePrice(product.getSalePrice());
        item.setSupplierProductName(defaultIfBlank(item.getSupplierProductName(), product.getName()));
        item.setBarcode(defaultIfBlank(item.getBarcode(), product.getBarcode()));
        supplierProductRepository
                .findByProductIdAndSupplierIdAndActiveTrue(
                        product.getId(), batch.getSupplier().getId())
                .ifPresent(item::setSupplierProduct);
        if (item.getSupplierProduct() != null) {
            item.setOldCost(item.getSupplierProduct().getCurrentCost());
        } else {
            item.setOldCost(BigDecimal.ZERO);
            item.setStatus(PriceUpdateBatchItemStatus.REVIEW);
            item.setErrorMessage("Matched product has no supplier association for this supplier");
        }
    }

    /** Copies batch-default request values after validating business constraints. */
    private void applyDefaultsRequest(PriceUpdateBatch batch, PriceUpdateBatchDefaultsRequest request) {
        if (request.newProductMarginPercentage() != null) {
            validateMargin(request.newProductMarginPercentage());
            batch.setDefaultNewProductMarginPercentage(request.newProductMarginPercentage());
        }
        if (request.applyCostUpdatesByDefault() != null) {
            batch.setApplyCostUpdatesByDefault(request.applyCostUpdatesByDefault());
        }
        if (request.applySalePriceUpdatesByDefault() != null) {
            batch.setApplySalePriceUpdatesByDefault(request.applySalePriceUpdatesByDefault());
        }
        if (request.excludeUnchangedByDefault() != null) {
            batch.setExcludeUnchangedByDefault(request.excludeUnchangedByDefault());
        }
    }

    /** Applies row-level admin overrides and recalculates the row if it remains actionable. */
    private void applyItemOverrides(
            PriceUpdateBatch batch, PriceUpdateBatchItem item, PriceUpdateBatchItemUpdateRequest request) {
        if (request.productId() != null) {
            Product product = supplierPricingCatalog
                    .findActiveProductById(request.productId())
                    .orElseThrow(
                            () -> new DomainException("PRODUCT_NOT_FOUND", HttpStatus.NOT_FOUND, "Product not found"));
            applyProductMatch(batch, item, product);
            item.setErrorMessage(null);
        }
        if (request.supplierSku() != null) {
            item.setSupplierSku(blankToNull(request.supplierSku()));
        }
        if (request.barcode() != null) {
            item.setBarcode(blankToNull(request.barcode()));
        }
        if (request.productName() != null) {
            item.setSupplierProductName(blankToNull(request.productName()));
        }
        if (request.newCost() != null) {
            item.setNewCost(request.newCost());
        }
        boolean marginExplicit = request.newProductMarginPercentage() != null;
        if (marginExplicit) {
            validateMargin(request.newProductMarginPercentage());
            item.setNewProductMarginPercentage(request.newProductMarginPercentage());
        }
        boolean hasFinalOverride = request.finalSalePrice() != null;
        if (hasFinalOverride) {
            item.setFinalSalePrice(request.finalSalePrice());
            if (!marginExplicit) {
                calculationService.calculateReverseFromPrice(batch, item);
            }
        }
        if (request.applyCostUpdate() != null) {
            item.setApplyCostUpdate(request.applyCostUpdate());
        }
        if (request.applySalePriceUpdate() != null) {
            item.setApplySalePriceUpdate(request.applySalePriceUpdate());
        }
        if (request.createProduct() != null) {
            item.setCreateProduct(request.createProduct());
        }
        if (request.status() == PriceUpdateBatchItemStatus.EXCLUDED) {
            item.setStatus(PriceUpdateBatchItemStatus.EXCLUDED);
            return;
        }
        if (request.status() != null && request.status() != PriceUpdateBatchItemStatus.EXCLUDED) {
            item.setStatus(request.status());
        }
        calculationService.calculate(batch, item, hasFinalOverride);
    }

    /** Applies cost and sale price updates for an existing product row. */
    private void applyExistingItem(PriceUpdateBatch batch, PriceUpdateBatchItem item, User currentUser) {
        SupplierProduct supplierProduct = requireSupplierProduct(item);
        Product product = requireProduct(item);
        if (item.isApplyCostUpdate()
                && item.getNewCost() != null
                && supplierProduct.getCurrentCost().compareTo(item.getNewCost()) != 0) {
            BigDecimal oldCost = supplierProduct.getCurrentCost();
            supplierProduct.setCurrentCost(item.getNewCost());
            costHistoryRepository.save(
                    costHistory(supplierProduct, oldCost, item.getNewCost(), batch.getId(), currentUser));
        }
        if (item.isApplySalePriceUpdate()
                && item.getFinalSalePrice() != null
                && product.getSalePrice().compareTo(item.getFinalSalePrice()) != 0) {
            supplierPricingCatalog.changeSalePriceForSupplierPriceBatch(
                    product, item.getFinalSalePrice(), batch.getId(), currentUser);
        }
    }

    /** Creates product and supplier-product rows for an approved CREATE row. */
    private void applyNewProductItem(PriceUpdateBatch batch, PriceUpdateBatchItem item, User currentUser) {
        if (!item.isCreateProduct()) {
            throw new DomainException(
                    "PRICE_BATCH_HAS_UNRESOLVED_ITEMS",
                    HttpStatus.CONFLICT,
                    "New products must be explicitly approved before applying the batch");
        }
        Product savedProduct = supplierPricingCatalog.createDraftProductForSupplierPriceBatch(
                item.getSupplierProductName(), blankToNull(item.getBarcode()), item.getFinalSalePrice());

        SupplierProduct supplierProduct = new SupplierProduct();
        supplierProduct.setSupplier(batch.getSupplier());
        supplierProduct.setProduct(savedProduct);
        supplierProduct.setSupplierSku(blankToNull(item.getSupplierSku()));
        supplierProduct.setCurrentCost(item.getNewCost());
        SupplierProduct savedSupplierProduct = supplierProductRepository.save(supplierProduct);

        item.setProduct(savedProduct);
        item.setSupplierProduct(savedSupplierProduct);
        costHistoryRepository.save(
                costHistory(savedSupplierProduct, null, item.getNewCost(), batch.getId(), currentUser));
        supplierPricingCatalog.recordInitialSalePriceForSupplierPriceBatch(
                savedProduct, item.getFinalSalePrice(), batch.getId(), currentUser);
    }

    /** Ensures no unresolved rows would be applied accidentally. */
    private void ensureResolvable(PriceUpdateBatch batch) {
        boolean hasBlockingRows = batch.getItems().stream()
                .anyMatch(item -> item.getStatus() == PriceUpdateBatchItemStatus.REVIEW
                        || item.getStatus() == PriceUpdateBatchItemStatus.ERROR
                        || (item.getStatus() == PriceUpdateBatchItemStatus.CREATE && !item.isCreateProduct()));
        if (hasBlockingRows) {
            throw new DomainException(
                    "PRICE_BATCH_HAS_UNRESOLVED_ITEMS",
                    HttpStatus.CONFLICT,
                    "Resolve review, error, and unapproved create rows before applying the batch");
        }
    }

    /** Finds a mutable batch and rejects already finalized states. */
    private PriceUpdateBatch findMutableForUpdate(Long id) {
        PriceUpdateBatch batch = batchRepository
                .findDetailedByIdForUpdate(id)
                .orElseThrow(() -> new DomainException(
                        "PRICE_BATCH_NOT_FOUND", HttpStatus.NOT_FOUND, "Price update batch not found"));
        if (batch.getStatus() == PriceUpdateBatchStatus.APPLIED
                || batch.getStatus() == PriceUpdateBatchStatus.CANCELLED) {
            throw new DomainException(
                    "PRICE_BATCH_INVALID_STATE", HttpStatus.CONFLICT, "Price update batch can no longer be modified");
        }
        return batch;
    }

    /** Finds a supplier or throws a uniform domain error. */
    private Supplier findSupplier(Long id) {
        return supplierRepository
                .findByIdAndActiveTrue(id)
                .orElseThrow(
                        () -> new DomainException("SUPPLIER_NOT_FOUND", HttpStatus.NOT_FOUND, "Supplier not found"));
    }

    /** Finds a detailed batch or throws a uniform domain error. */
    private PriceUpdateBatch findDetailed(Long id) {
        return batchRepository
                .findDetailedById(id)
                .orElseThrow(() -> new DomainException(
                        "PRICE_BATCH_NOT_FOUND", HttpStatus.NOT_FOUND, "Price update batch not found"));
    }

    /** Returns the required existing product from an item. */
    private Product requireProduct(PriceUpdateBatchItem item) {
        if (item.getProduct() == null) {
            throw new DomainException(
                    "PRICE_BATCH_ITEM_INVALID", HttpStatus.BAD_REQUEST, "Price update item has no product");
        }
        return item.getProduct();
    }

    /** Returns the required supplier product from an existing update item. */
    private SupplierProduct requireSupplierProduct(PriceUpdateBatchItem item) {
        if (item.getSupplierProduct() == null) {
            throw new DomainException(
                    "PRICE_BATCH_ITEM_INVALID", HttpStatus.BAD_REQUEST, "Price update item has no supplier product");
        }
        return item.getSupplierProduct();
    }

    /** Builds replacement cost history for a batch-applied cost change. */
    private SupplierProductCostHistory costHistory(
            SupplierProduct supplierProduct, BigDecimal oldCost, BigDecimal newCost, Long batchId, User currentUser) {
        SupplierProductCostHistory history = new SupplierProductCostHistory();
        history.setSupplierProduct(supplierProduct);
        history.setOldCost(oldCost);
        history.setNewCost(newCost);
        history.setSource(SOURCE_PRICE_BATCH);
        history.setReferenceType(REFERENCE_PRICE_BATCH);
        history.setReferenceId(batchId);
        history.setCreatedByUserId(currentUser == null ? null : currentUser.getId());
        return history;
    }

    /** Returns the authenticated user for audit fields when a security context is available. */
    private User currentUserOrNull() {
        try {
            return securityContextHelper.getCurrentUser();
        } catch (IllegalStateException ex) {
            return null;
        }
    }

    /** Validates margin percentage before applying it to defaults or rows. */
    private void validateMargin(BigDecimal margin) {
        if (margin.compareTo(BigDecimal.ZERO) < 0 || margin.compareTo(BigDecimal.valueOf(100)) >= 0) {
            throw new DomainException(
                    "PRICE_BATCH_ITEM_INVALID",
                    HttpStatus.BAD_REQUEST,
                    "Margin percentage must be between 0 and 99.99");
        }
    }

    /** Converts a batch entity into a list view DTO. */
    private PriceUpdateBatchSummaryDto toSummaryDto(PriceUpdateBatch batch) {
        return new PriceUpdateBatchSummaryDto(
                batch.getId(),
                batch.getSupplier() == null ? null : batch.getSupplier().getId(),
                batch.getSupplier() == null ? null : batch.getSupplier().getName(),
                batch.getType(),
                batch.getStatus(),
                batch.getSourceFileName(),
                batch.getCreatedAt(),
                batch.getAppliedAt());
    }

    /** Converts a batch entity into a detail DTO sorted by row id. */
    private PriceUpdateBatchDetailDto toDetailDto(PriceUpdateBatch batch) {
        List<PriceUpdateBatchItemDto> items = batch.getItems().stream()
                .sorted(Comparator.comparing(PriceUpdateBatchItem::getId, Comparator.nullsLast(Long::compareTo)))
                .map(this::toItemDto)
                .toList();
        return new PriceUpdateBatchDetailDto(
                batch.getId(),
                batch.getSupplier() == null ? null : batch.getSupplier().getId(),
                batch.getSupplier() == null ? null : batch.getSupplier().getName(),
                batch.getType(),
                batch.getStatus(),
                batch.getSourceFileName(),
                batch.getDefaultNewProductMarginPercentage(),
                batch.isApplyCostUpdatesByDefault(),
                batch.isApplySalePriceUpdatesByDefault(),
                batch.isExcludeUnchangedByDefault(),
                batch.getNotes(),
                batch.getCreatedAt(),
                batch.getAppliedAt(),
                items);
    }

    /** Converts a preview item entity into an API DTO. */
    private PriceUpdateBatchItemDto toItemDto(PriceUpdateBatchItem item) {
        Product product = item.getProduct();
        return new PriceUpdateBatchItemDto(
                item.getId(),
                item.getSupplierProduct() == null
                        ? null
                        : item.getSupplierProduct().getId(),
                product == null ? null : product.getId(),
                product == null ? null : product.getName(),
                item.getSupplierSku(),
                item.getSupplierProductName(),
                item.getBarcode(),
                item.getOldCost(),
                item.getNewCost(),
                item.getSupplierVariationPercentage(),
                item.getNewProductMarginPercentage(),
                item.getOldSalePrice(),
                item.getSuggestedSalePrice(),
                item.getFinalSalePrice(),
                item.isApplyCostUpdate(),
                item.isApplySalePriceUpdate(),
                item.isCreateProduct(),
                item.getStatus(),
                item.getErrorMessage());
    }

    /** Converts blank text into null after trimming. */
    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    /** Uses a fallback when text is null or blank. */
    private String defaultIfBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
