package com.dietetica.lembas.suppliers.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.catalog.api.SupplierPricingCatalog;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.suppliers.dto.PriceUpdateBatchDefaultsRequest;
import com.dietetica.lembas.suppliers.dto.PriceUpdateBatchDetailDto;
import com.dietetica.lembas.suppliers.dto.PriceUpdateBatchItemUpdateRequest;
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
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.multipart.MultipartFile;

/** Unit tests for the price update batch application service. */
@ExtendWith(MockitoExtension.class)
class PriceUpdateBatchServiceTest {

    @Mock
    private PriceUpdateBatchRepository batchRepository;

    @Mock
    private PriceUpdateBatchItemRepository itemRepository;

    @Mock
    private SupplierRepository supplierRepository;

    @Mock
    private SupplierProductRepository supplierProductRepository;

    @Mock
    private SupplierProductCostHistoryRepository costHistoryRepository;

    @Mock
    private SupplierPricingCatalog supplierPricingCatalog;

    @Mock
    private PriceUpdateImportService importService;

    @Mock
    private PriceUpdateCalculationService calculationService;

    @Mock
    private SecurityContextHelper securityContextHelper;

    private PriceUpdateBatchService service;

    private final Supplier supplier = supplier(10L, "Distribuidora");
    private final Product product = product(100L, "Yerba", BigDecimal.valueOf(8000));
    private final SupplierProduct supplierProduct = supplierProduct(200L, supplier, product, BigDecimal.valueOf(5200));

    @BeforeEach
    void setUp() {
        service = new PriceUpdateBatchService(
                batchRepository,
                itemRepository,
                supplierRepository,
                supplierProductRepository,
                costHistoryRepository,
                supplierPricingCatalog,
                importService,
                calculationService,
                securityContextHelper);
        lenient().when(securityContextHelper.getCurrentUser()).thenThrow(new IllegalStateException("No auth"));
    }

    // ---------------------------------------------------------------
    // list
    // ---------------------------------------------------------------

    @Test
    void shouldListBatchesWithFilters() {
        var batch = draftBatch(1L);
        when(batchRepository.search(10L, PriceUpdateBatchStatus.DRAFT, PageRequest.of(0, 10)))
                .thenReturn(new PageImpl<>(List.of(batch)));

        var result = service.list(10L, PriceUpdateBatchStatus.DRAFT, PageRequest.of(0, 10));

        assertThat(result).hasSize(1);
    }

    // ---------------------------------------------------------------
    // get
    // ---------------------------------------------------------------

    @Test
    void shouldReturnBatchDetail() {
        var batch = draftBatchWithItems(1L);
        when(batchRepository.findDetailedById(1L)).thenReturn(Optional.of(batch));

        PriceUpdateBatchDetailDto dto = service.get(1L);

        assertThat(dto.id()).isEqualTo(1L);
        assertThat(dto.items()).hasSize(1);
    }

    @Test
    void shouldThrowWhenBatchNotFoundForGet() {
        when(batchRepository.findDetailedById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(999L))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("PRICE_BATCH_NOT_FOUND");
    }

    // ---------------------------------------------------------------
    // createManual
    // ---------------------------------------------------------------

    @Test
    void shouldCreateManualBatch() {
        when(supplierRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(supplier));
        mockMatchReturnsNothing();
        PriceUpdateManualBatchRequest request = new PriceUpdateManualBatchRequest(
                10L,
                null,
                List.of(new PriceUpdateManualItemRequest("SUP-1", "779001", "Producto A", BigDecimal.valueOf(5200))),
                null);
        when(batchRepository.save(any())).thenAnswer(invocation -> {
            PriceUpdateBatch saved = invocation.getArgument(0);
            saved.setId(1L);
            saved.getItems().forEach(item -> item.setId(100L));
            return saved;
        });

        PriceUpdateBatchDetailDto dto = service.createManual(request);

        assertThat(dto.id()).isEqualTo(1L);
        assertThat(dto.type()).isEqualTo(PriceUpdateBatchType.MANUAL_GRID);
        assertThat(dto.status()).isEqualTo(PriceUpdateBatchStatus.DRAFT);
        assertThat(dto.items()).hasSize(1);
        verify(batchRepository).save(any());
    }

    @Test
    void shouldRejectManualBatchWhenSupplierNotFound() {
        when(supplierRepository.findByIdAndActiveTrue(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createManual(new PriceUpdateManualBatchRequest(999L, null, List.of(), null)))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("SUPPLIER_NOT_FOUND");
    }

    // ---------------------------------------------------------------
    // importFile
    // ---------------------------------------------------------------

    @Test
    void shouldCreateBatchFromImportedFile() {
        var row = new SupplierPriceRow("SUP-1", "779001", "Producto A", BigDecimal.valueOf(5200), null);
        MultipartFile file = mock(MultipartFile.class);
        when(supplierRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(supplier));
        when(importService.parse(file)).thenReturn(List.of(row));
        mockMatchReturnsNothing();
        when(batchRepository.save(any())).thenAnswer(invocation -> {
            PriceUpdateBatch saved = invocation.getArgument(0);
            saved.setId(2L);
            saved.getItems().forEach(item -> item.setId(101L));
            return saved;
        });

        PriceUpdateBatchDetailDto dto = service.importFile(10L, nullDefaults(), file, "notes");

        assertThat(dto.id()).isEqualTo(2L);
        assertThat(dto.type()).isEqualTo(PriceUpdateBatchType.SUPPLIER_FILE);
        assertThat(dto.items()).hasSize(1);
        verify(batchRepository).save(any());
    }

    // ---------------------------------------------------------------
    // updateDefaults
    // ---------------------------------------------------------------

    @Test
    void shouldUpdateBatchDefaults() {
        var batch = draftBatchWithItems(1L);
        when(batchRepository.findDetailedByIdForUpdate(1L)).thenReturn(Optional.of(batch));

        var request = new PriceUpdateBatchDefaultsRequest(BigDecimal.valueOf(40), false, false, true);
        service.updateDefaults(1L, request);

        assertThat(batch.getDefaultNewProductMarginPercentage()).isEqualByComparingTo("40");
        assertThat(batch.isApplyCostUpdatesByDefault()).isFalse();
        assertThat(batch.isApplySalePriceUpdatesByDefault()).isFalse();
        assertThat(batch.isExcludeUnchangedByDefault()).isTrue();
        verify(calculationService).calculate(any(), any(), eq(false));
    }

    // ---------------------------------------------------------------
    // applyDefaultsToAll
    // ---------------------------------------------------------------

    @Test
    void shouldApplyDefaultsToAllItems() {
        var batch = draftBatchWithItems(1L);
        when(batchRepository.findDetailedByIdForUpdate(1L)).thenReturn(Optional.of(batch));

        service.applyDefaultsToAll(1L);

        verify(calculationService).applyDefaults(any(), any());
    }

    // ---------------------------------------------------------------
    // updateItem
    // ---------------------------------------------------------------

    @Test
    void shouldUpdateItemWithMarginOverride() {
        var batch = draftBatchWithItems(1L);
        PriceUpdateBatchItem item = batch.getItems().getFirst();
        when(batchRepository.findDetailedByIdForUpdate(1L)).thenReturn(Optional.of(batch));

        var request = new PriceUpdateBatchItemUpdateRequest(
                null, null, null, null, null, BigDecimal.valueOf(30), null, null, null, null, null);
        service.updateItem(1L, item.getId(), request);

        assertThat(item.getNewProductMarginPercentage()).isEqualByComparingTo("30");
    }

    @Test
    void shouldUpdateItemWithFinalPriceOverride() {
        var batch = draftBatchWithItems(1L);
        PriceUpdateBatchItem item = batch.getItems().getFirst();
        item.setNewCost(BigDecimal.valueOf(4000));
        when(batchRepository.findDetailedByIdForUpdate(1L)).thenReturn(Optional.of(batch));

        var request = new PriceUpdateBatchItemUpdateRequest(
                null, null, null, null, null, null, BigDecimal.valueOf(6200), null, null, null, null);
        service.updateItem(1L, item.getId(), request);

        assertThat(item.getFinalSalePrice()).isEqualByComparingTo("6200");
        verify(calculationService).calculateReverseFromPrice(any(), any());
    }

    @Test
    void shouldUpdateItemWithExcludedStatus() {
        var batch = draftBatchWithItems(1L);
        PriceUpdateBatchItem item = batch.getItems().getFirst();
        when(batchRepository.findDetailedByIdForUpdate(1L)).thenReturn(Optional.of(batch));

        var request = new PriceUpdateBatchItemUpdateRequest(
                null, null, null, null, null, null, null, null, null, null, PriceUpdateBatchItemStatus.EXCLUDED);
        service.updateItem(1L, item.getId(), request);

        assertThat(item.getStatus()).isEqualTo(PriceUpdateBatchItemStatus.EXCLUDED);
    }

    @Test
    void shouldThrowWhenItemNotFound() {
        var batch = draftBatchWithItems(1L);
        when(batchRepository.findDetailedByIdForUpdate(1L)).thenReturn(Optional.of(batch));

        var request =
                new PriceUpdateBatchItemUpdateRequest(null, null, null, null, null, null, null, null, null, null, null);
        assertThatThrownBy(() -> service.updateItem(1L, 999L, request))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("PRICE_BATCH_ITEM_NOT_FOUND");
    }

    // ---------------------------------------------------------------
    // validate
    // ---------------------------------------------------------------

    @Test
    void shouldValidateBatchWhenNoBlockingItems() {
        var batch = draftBatchWithItems(1L);
        batch.getItems().forEach(item -> item.setStatus(PriceUpdateBatchItemStatus.UPDATE));
        when(batchRepository.findDetailedByIdForUpdate(1L)).thenReturn(Optional.of(batch));

        service.validate(1L);

        assertThat(batch.getStatus()).isEqualTo(PriceUpdateBatchStatus.VALIDATED);
    }

    @Test
    void shouldRejectValidateWhenBlockingItemsExist() {
        var batch = draftBatchWithItems(1L);
        batch.getItems().forEach(item -> item.setStatus(PriceUpdateBatchItemStatus.REVIEW));
        when(batchRepository.findDetailedByIdForUpdate(1L)).thenReturn(Optional.of(batch));

        assertThatThrownBy(() -> service.validate(1L))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("PRICE_BATCH_HAS_UNRESOLVED_ITEMS");
    }

    // ---------------------------------------------------------------
    // apply -- existing products
    // ---------------------------------------------------------------

    @Test
    void shouldApplyBatchUpdatingExistingProducts() {
        var batch = draftBatchWithItems(1L);
        var item = batch.getItems().getFirst();
        item.setStatus(PriceUpdateBatchItemStatus.UPDATE);
        item.setSupplierProduct(supplierProduct);
        item.setProduct(product);
        item.setApplyCostUpdate(true);
        item.setApplySalePriceUpdate(true);
        item.setNewCost(BigDecimal.valueOf(5800));
        item.setFinalSalePrice(BigDecimal.valueOf(9000));
        when(batchRepository.findDetailedByIdForUpdate(1L)).thenReturn(Optional.of(batch));

        service.apply(1L);

        assertThat(batch.getStatus()).isEqualTo(PriceUpdateBatchStatus.APPLIED);
        assertThat(batch.getAppliedAt()).isNotNull();
        assertThat(supplierProduct.getCurrentCost()).isEqualByComparingTo("5800");
        verify(costHistoryRepository).save(any(SupplierProductCostHistory.class));
        verify(supplierPricingCatalog)
                .changeSalePriceForSupplierPriceBatch(product, BigDecimal.valueOf(9000), 1L, null);
    }

    @Test
    void shouldApplyBatchSkippingUnchangedAndExcludedItems() {
        var batch = draftBatchWithItems(1L);
        var item = batch.getItems().getFirst();
        item.setStatus(PriceUpdateBatchItemStatus.UNCHANGED);
        when(batchRepository.findDetailedByIdForUpdate(1L)).thenReturn(Optional.of(batch));

        service.apply(1L);

        assertThat(batch.getStatus()).isEqualTo(PriceUpdateBatchStatus.APPLIED);
        verify(costHistoryRepository, never()).save(any());
        verify(supplierPricingCatalog, never()).changeSalePriceForSupplierPriceBatch(any(), any(), any(), any());
    }

    @Test
    void shouldRejectApplyWhenSupplierProductMissing() {
        var batch = draftBatchWithItems(1L);
        var item = batch.getItems().getFirst();
        item.setStatus(PriceUpdateBatchItemStatus.UPDATE);
        item.setSupplierProduct(null);
        item.setProduct(product);
        when(batchRepository.findDetailedByIdForUpdate(1L)).thenReturn(Optional.of(batch));

        assertThatThrownBy(() -> service.apply(1L))
                .isInstanceOf(DomainException.class)
                .extracting("code", "status")
                .containsExactly("PRICE_BATCH_ITEM_INVALID", org.springframework.http.HttpStatus.BAD_REQUEST);
    }

    @Test
    void shouldSkipCostUpdateWhenCostsAreEqual() {
        var batch = draftBatchWithItems(1L);
        var item = batch.getItems().getFirst();
        item.setStatus(PriceUpdateBatchItemStatus.UPDATE);
        item.setSupplierProduct(supplierProduct);
        item.setProduct(product);
        item.setApplyCostUpdate(true);
        item.setApplySalePriceUpdate(true);
        item.setNewCost(BigDecimal.valueOf(5200)); // same as currentCost
        item.setFinalSalePrice(BigDecimal.valueOf(9000));
        when(batchRepository.findDetailedByIdForUpdate(1L)).thenReturn(Optional.of(batch));

        service.apply(1L);

        assertThat(batch.getStatus()).isEqualTo(PriceUpdateBatchStatus.APPLIED);
        // Current cost was not changed (same value), but sale price was different
        assertThat(supplierProduct.getCurrentCost()).isEqualByComparingTo("5200");
        verify(costHistoryRepository, never()).save(any());
        verify(supplierPricingCatalog)
                .changeSalePriceForSupplierPriceBatch(product, BigDecimal.valueOf(9000), 1L, null);
    }

    // ---------------------------------------------------------------
    // apply -- new products
    // ---------------------------------------------------------------

    @Test
    void shouldApplyBatchCreatingNewProducts() {
        var batch = draftBatchWithItems(1L);
        var item = batch.getItems().getFirst();
        item.setStatus(PriceUpdateBatchItemStatus.CREATE);
        item.setCreateProduct(true);
        item.setSupplierProductName("Nuevo Producto");
        item.setNewCost(BigDecimal.valueOf(4000));
        item.setFinalSalePrice(BigDecimal.valueOf(6153.85));
        when(batchRepository.findDetailedByIdForUpdate(1L)).thenReturn(Optional.of(batch));
        Product createdProduct = product(200L, "Nuevo Producto", BigDecimal.valueOf(6153.85));
        when(supplierPricingCatalog.createDraftProductForSupplierPriceBatch(
                        "Nuevo Producto", null, BigDecimal.valueOf(6153.85)))
                .thenReturn(createdProduct);
        when(supplierProductRepository.save(any(SupplierProduct.class))).thenAnswer(invocation -> {
            SupplierProduct sp = invocation.getArgument(0);
            sp.setId(300L);
            return sp;
        });

        service.apply(1L);

        assertThat(batch.getStatus()).isEqualTo(PriceUpdateBatchStatus.APPLIED);
        verify(supplierProductRepository).save(any(SupplierProduct.class));
        verify(costHistoryRepository).save(any(SupplierProductCostHistory.class));
        verify(supplierPricingCatalog)
                .recordInitialSalePriceForSupplierPriceBatch(createdProduct, BigDecimal.valueOf(6153.85), 1L, null);
    }

    @Test
    void shouldRejectApplyWhenCreateProductNotApproved() {
        var batch = draftBatchWithItems(1L);
        var item = batch.getItems().getFirst();
        item.setStatus(PriceUpdateBatchItemStatus.CREATE);
        item.setCreateProduct(false);
        when(batchRepository.findDetailedByIdForUpdate(1L)).thenReturn(Optional.of(batch));

        assertThatThrownBy(() -> service.apply(1L))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("PRICE_BATCH_HAS_UNRESOLVED_ITEMS");
    }

    // ---------------------------------------------------------------
    // cancel
    // ---------------------------------------------------------------

    @Test
    void shouldCancelDraftBatch() {
        var batch = draftBatch(1L);
        when(batchRepository.findDetailedByIdForUpdate(1L)).thenReturn(Optional.of(batch));

        service.cancel(1L);

        assertThat(batch.getStatus()).isEqualTo(PriceUpdateBatchStatus.CANCELLED);
        assertThat(batch.getCancelledAt()).isNotNull();
    }

    // ---------------------------------------------------------------
    // error cases
    // ---------------------------------------------------------------

    @Test
    void shouldThrowWhenBatchNotFound() {
        when(batchRepository.findDetailedByIdForUpdate(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.cancel(999L))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("PRICE_BATCH_NOT_FOUND");
    }

    @Test
    void shouldThrowWhenMutatingAppliedBatch() {
        var batch = draftBatch(1L);
        batch.setStatus(PriceUpdateBatchStatus.APPLIED);
        when(batchRepository.findDetailedByIdForUpdate(1L)).thenReturn(Optional.of(batch));

        assertThatThrownBy(() -> service.cancel(1L))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("PRICE_BATCH_INVALID_STATE");
    }

    @Test
    void shouldThrowWhenMutatingCancelledBatch() {
        var batch = draftBatch(1L);
        batch.setStatus(PriceUpdateBatchStatus.CANCELLED);
        when(batchRepository.findDetailedByIdForUpdate(1L)).thenReturn(Optional.of(batch));

        assertThatThrownBy(() -> service.cancel(1L))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("PRICE_BATCH_INVALID_STATE");
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    private PriceUpdateBatch draftBatch(Long id) {
        PriceUpdateBatch batch = new PriceUpdateBatch();
        batch.setId(id);
        batch.setSupplier(supplier);
        batch.setType(PriceUpdateBatchType.MANUAL_GRID);
        batch.setStatus(PriceUpdateBatchStatus.DRAFT);
        return batch;
    }

    private PriceUpdateBatch draftBatchWithItems(Long id) {
        PriceUpdateBatch batch = draftBatch(id);
        PriceUpdateBatchItem item = new PriceUpdateBatchItem();
        item.setId(100L);
        item.setBatch(batch);
        item.setNewCost(BigDecimal.valueOf(5200));
        item.setOldCost(BigDecimal.valueOf(4800));
        item.setFinalSalePrice(BigDecimal.valueOf(8000));
        item.setOldSalePrice(BigDecimal.valueOf(7500));
        item.setNewProductMarginPercentage(BigDecimal.valueOf(35));
        item.setSuggestedSalePrice(BigDecimal.valueOf(8000));
        item.setStatus(PriceUpdateBatchItemStatus.UPDATE);
        batch.addItem(item);
        return batch;
    }

    private PriceUpdateBatchDefaultsRequest nullDefaults() {
        return new PriceUpdateBatchDefaultsRequest(null, null, null, null);
    }

    private void mockMatchReturnsNothing() {
        lenient()
                .when(supplierProductRepository.findBySupplierIdAndSupplierSkuIgnoreCaseAndActiveTrue(
                        any(), anyString()))
                .thenReturn(Optional.empty());
        lenient()
                .when(supplierPricingCatalog.findActiveProductByBarcode(anyString()))
                .thenReturn(Optional.empty());
        lenient()
                .when(supplierPricingCatalog.findActiveProductsByExactName(anyString()))
                .thenReturn(List.of());
    }

    private static Supplier supplier(Long id, String name) {
        Supplier s = new Supplier();
        s.setId(id);
        s.setName(name);
        return s;
    }

    private static Product product(Long id, String name, BigDecimal salePrice) {
        Product p = new Product();
        p.setId(id);
        p.setName(name);
        p.setSalePrice(salePrice);
        return p;
    }

    private static SupplierProduct supplierProduct(
            Long id, Supplier supplier, Product product, BigDecimal currentCost) {
        SupplierProduct sp = new SupplierProduct();
        sp.setId(id);
        sp.setSupplier(supplier);
        sp.setProduct(product);
        sp.setCurrentCost(currentCost);
        return sp;
    }
}
