package com.dietetica.lembas.catalog.service;

import com.dietetica.lembas.catalog.dto.ProductDetailDto;
import com.dietetica.lembas.catalog.dto.ProductRequest;
import com.dietetica.lembas.catalog.dto.ProductSalePriceHistoryDto;
import com.dietetica.lembas.catalog.dto.ProductSummaryDto;
import com.dietetica.lembas.catalog.model.Category;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import com.dietetica.lembas.catalog.repository.CategoryRepository;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.catalog.repository.ProductSalePriceHistoryRepository;
import com.dietetica.lembas.inventory.api.InventoryQuery;
import com.dietetica.lembas.shared.branch.api.BranchQuery;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.exception.DomainException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Application service for admin product catalog management. */
@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductSalePriceHistoryRepository salePriceHistoryRepository;
    private final InventoryQuery inventoryQuery;
    private final BranchQuery branchQuery;

    public ProductService(
            ProductRepository productRepository,
            CategoryRepository categoryRepository,
            ObjectProvider<ProductSalePriceHistoryRepository> salePriceHistoryRepository,
            InventoryQuery inventoryQuery,
            BranchQuery branchQuery) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.salePriceHistoryRepository =
                salePriceHistoryRepository == null ? null : salePriceHistoryRepository.getIfAvailable();
        this.inventoryQuery = inventoryQuery;
        this.branchQuery = branchQuery;
    }

    /** Lists active products with optional table filters. */
    @Transactional(readOnly = true)
    public Page<ProductSummaryDto> listAdminProducts(
            String search, Long categoryId, ProductOnlineStatus status, Pageable pageable) {
        String normalizedSearch =
                search == null || search.isBlank() ? null : search.trim().toLowerCase(Locale.ROOT);
        Pageable sortedPageable = mapSort(pageable);
        return productRepository
                .searchAdminProducts(normalizedSearch, categoryId, status, sortedPageable)
                .map(this::toSummaryDto);
    }

    /** Returns a product detail for edit screens. */
    @Transactional(readOnly = true)
    public ProductDetailDto getDetail(Long id) {
        return toDetailDto(findActiveById(id));
    }

    /** Creates a product after validating category and unique barcode. */
    @Transactional
    public ProductDetailDto create(ProductRequest request) {
        validateBarcodeUnique(request.barcode(), null);
        Product product = new Product();
        applyRequest(product, request);
        return toDetailDto(productRepository.save(product));
    }

    /** Updates all editable catalog fields on an active product. */
    @Transactional
    public ProductDetailDto update(Long id, ProductRequest request) {
        Product product = findActiveById(id);
        validateBarcodeUnique(request.barcode(), id);
        applyRequest(product, request);
        return toDetailDto(product);
    }

    /** Lists sale price history for one active product. */
    @Transactional(readOnly = true)
    public Page<ProductSalePriceHistoryDto> listSalePriceHistory(Long productId, Pageable pageable) {
        findActiveById(productId);
        if (salePriceHistoryRepository == null) {
            return new PageImpl<>(java.util.List.of(), pageable, 0);
        }
        return salePriceHistoryRepository
                .findByProductIdOrderByValidFromDesc(productId, pageable)
                .map(history -> new ProductSalePriceHistoryDto(
                        history.getId(),
                        history.getProduct().getId(),
                        history.getOldPrice(),
                        history.getNewPrice(),
                        history.getValidFrom(),
                        history.getReason(),
                        history.getSource(),
                        history.getReferenceType(),
                        history.getReferenceId()));
    }

    /** Soft-deletes a product so future stock/order relations can keep history. */
    @Transactional
    public void delete(Long id) {
        Product product = findActiveById(id);
        product.setActive(false);
    }

    /** Changes the online publishing status after validating the allowed transition. */
    @Transactional
    public ProductSummaryDto changeOnlineStatus(Long id, ProductOnlineStatus targetStatus) {
        Product product = findActiveById(id);
        ProductOnlineStatus currentStatus = product.getOnlineStatus();

        if (!currentStatus.canTransitionTo(targetStatus)) {
            throw new DomainException(
                    "PRODUCT_STATUS_INVALID_TRANSITION",
                    org.springframework.http.HttpStatus.CONFLICT,
                    "Product status transition is not allowed");
        }

        product.setOnlineStatus(targetStatus);
        return toSummaryDto(product);
    }

    // ---------------------------------------------------------------------------
    // Public store methods
    // ---------------------------------------------------------------------------

    /** Returns 15 random published products without branch availability for legacy callers. */
    @Transactional(readOnly = true)
    public Page<ProductSummaryDto> listRandomPublishedProducts() {
        var products = productRepository.findRandomPublishedProducts(PageRequest.of(0, 15));
        var dtos = products.stream().map(this::toSummaryDto).toList();
        return new org.springframework.data.domain.PageImpl<>(dtos);
    }

    /** Returns 15 random published products for the home page featured section. */
    @Transactional(readOnly = true)
    public Page<ProductSummaryDto> listRandomPublishedProducts(Long branchId) {
        Long resolvedBranchId = resolveStoreBranchId(branchId);
        // TODO: Replace random selection with metric-based ranking (views, sales, recency)
        //       once analytics events are captured in the products table.
        var products = productRepository.findRandomPublishedProducts(PageRequest.of(0, 15));
        Map<Long, BigDecimal> availability = availabilityByProduct(products, resolvedBranchId);
        var dtos = products.stream()
                .map(product -> toSummaryDto(product, availability.getOrDefault(product.getId(), BigDecimal.ZERO)))
                .toList();
        return new org.springframework.data.domain.PageImpl<>(dtos);
    }

    /** Lists products visible in the public online store without branch availability for legacy callers. */
    @Transactional(readOnly = true)
    public Page<ProductSummaryDto> listStoreProducts(String search, Long categoryId, Pageable pageable) {
        String normalizedSearch =
                search == null || search.isBlank() ? null : search.trim().toLowerCase(Locale.ROOT);
        Pageable sortedPageable = pageable.getSort().isUnsorted()
                ? PageRequest.of(
                        pageable.getPageNumber(),
                        pageable.getPageSize(),
                        Sort.by("name").ascending())
                : pageable;
        return productRepository
                .searchStoreProducts(normalizedSearch, categoryId, sortedPageable)
                .map(this::toSummaryDto);
    }

    /** Lists products visible in the public online store with real branch availability. */
    @Transactional(readOnly = true)
    public Page<ProductSummaryDto> listStoreProducts(String search, Long categoryId, Long branchId, Pageable pageable) {
        Long resolvedBranchId = resolveStoreBranchId(branchId);
        String normalizedSearch =
                search == null || search.isBlank() ? null : search.trim().toLowerCase(Locale.ROOT);
        Pageable sortedPageable = pageable.getSort().isUnsorted()
                ? PageRequest.of(
                        pageable.getPageNumber(),
                        pageable.getPageSize(),
                        Sort.by("name").ascending())
                : pageable;

        Page<Product> products = productRepository.searchStoreProducts(normalizedSearch, categoryId, sortedPageable);
        Map<Long, BigDecimal> availability = availabilityByProduct(products.getContent(), resolvedBranchId);
        return products.map(
                product -> toSummaryDto(product, availability.getOrDefault(product.getId(), BigDecimal.ZERO)));
    }

    /** Returns a product visible in the public online store without branch availability for legacy callers. */
    @Transactional(readOnly = true)
    public ProductDetailDto getStoreProductDetail(Long id) {
        Product product = productRepository
                .findByIdAndActiveTrueAndOnlineStatus(id, ProductOnlineStatus.PUBLISHED)
                .orElseThrow(() -> new DomainException("PRODUCT_NOT_FOUND", HttpStatus.NOT_FOUND, "Product not found"));
        return toDetailDto(product);
    }

    /** Returns a product visible in the public online store with branch availability. */
    @Transactional(readOnly = true)
    public ProductDetailDto getStoreProductDetail(Long id, Long branchId) {
        Long resolvedBranchId = resolveStoreBranchId(branchId);
        Product product = productRepository
                .findByIdAndActiveTrueAndOnlineStatus(id, ProductOnlineStatus.PUBLISHED)
                .orElseThrow(() -> new DomainException("PRODUCT_NOT_FOUND", HttpStatus.NOT_FOUND, "Product not found"));
        BigDecimal availableStock = inventoryQuery.calculateAvailableQuantity(product.getId(), resolvedBranchId);
        return toDetailDto(product, availableStock);
    }

    /** Returns random published products from the same category without availability for legacy callers. */
    @Transactional(readOnly = true)
    public Page<ProductSummaryDto> listRandomRelatedProducts(Long productId) {
        Product product = productRepository
                .findByIdAndActiveTrueAndOnlineStatus(productId, ProductOnlineStatus.PUBLISHED)
                .orElseThrow(() -> new DomainException("PRODUCT_NOT_FOUND", HttpStatus.NOT_FOUND, "Product not found"));
        Long categoryId = product.getCategory().getId();
        var products = productRepository.findRandomRelatedProducts(categoryId, productId, PageRequest.of(0, 6));
        var dtos = products.stream().map(this::toSummaryDto).toList();
        return new org.springframework.data.domain.PageImpl<>(dtos);
    }

    /** Returns random published products from the same category, excluding the current product. */
    @Transactional(readOnly = true)
    public Page<ProductSummaryDto> listRandomRelatedProducts(Long productId, Long branchId) {
        Long resolvedBranchId = resolveStoreBranchId(branchId);
        Product product = productRepository
                .findByIdAndActiveTrueAndOnlineStatus(productId, ProductOnlineStatus.PUBLISHED)
                .orElseThrow(() -> new DomainException("PRODUCT_NOT_FOUND", HttpStatus.NOT_FOUND, "Product not found"));
        Long categoryId = product.getCategory().getId();
        var products = productRepository.findRandomRelatedProducts(categoryId, productId, PageRequest.of(0, 6));
        Map<Long, BigDecimal> availability = availabilityByProduct(products, resolvedBranchId);
        var dtos = products.stream()
                .map(related -> toSummaryDto(related, availability.getOrDefault(related.getId(), BigDecimal.ZERO)))
                .toList();
        return new org.springframework.data.domain.PageImpl<>(dtos);
    }

    /** Copies validated request fields into the entity. */
    private void applyRequest(Product product, ProductRequest request) {
        Category category = categoryRepository
                .findById(request.categoryId())
                .orElseThrow(
                        () -> new DomainException("CATEGORY_NOT_FOUND", HttpStatus.NOT_FOUND, "Category not found"));
        product.setCategory(category);
        product.setName(request.name().trim());
        product.setDescription(normalizeBlank(request.description()));
        product.setBrandName(normalizeBlank(request.brandName()));
        product.setBarcode(normalizeBlank(request.barcode()));
        product.setSalePrice(request.salePrice());
        product.setMinimumStock(request.minimumStock());
        product.setImageUrl(normalizeBlank(request.imageUrl()));
        product.setOnlineStatus(request.onlineStatus());
    }

    /** Ensures no other active product owns the provided barcode. */
    private void validateBarcodeUnique(String rawBarcode, Long currentId) {
        String barcode = normalizeBlank(rawBarcode);
        if (barcode == null) {
            return;
        }
        boolean duplicated = currentId == null
                ? productRepository.existsByBarcodeIgnoreCaseAndActiveTrue(barcode)
                : productRepository.existsByBarcodeIgnoreCaseAndActiveTrueAndIdNot(barcode, currentId);
        if (duplicated) {
            throw new DomainException(
                    "PRODUCT_BARCODE_DUPLICATED", HttpStatus.CONFLICT, "Product barcode already exists");
        }
    }

    /**
     * Maps frontend sort field names to JPA entity paths.
     * The JPQL query joins Product p with Category c, so category-level
     * fields need the c alias prefix.
     */
    private Pageable mapSort(Pageable pageable) {
        if (pageable.getSort().isUnsorted()) {
            return pageable;
        }
        Sort mappedSort = Sort.unsorted();
        for (Sort.Order order : pageable.getSort()) {
            String property =
                    switch (order.getProperty()) {
                        case "categoryName" -> "c.name";
                        default -> order.getProperty();
                    };
            mappedSort = mappedSort.and(Sort.by(new Sort.Order(order.getDirection(), property)));
        }
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), mappedSort);
    }

    /** Finds an active product or raises the uniform not-found error. */
    private Product findActiveById(Long id) {
        return productRepository
                .findByIdAndActiveTrue(id)
                .orElseThrow(() -> new DomainException("PRODUCT_NOT_FOUND", HttpStatus.NOT_FOUND, "Product not found"));
    }

    /** Resolves the branch used by public stock availability, defaulting to the first active branch. */
    private Long resolveStoreBranchId(Long branchId) {
        if (branchId != null) {
            if (!branchQuery.existsActive(branchId)) {
                throw new DomainException("BRANCH_NOT_FOUND", HttpStatus.NOT_FOUND, "Branch not found");
            }
            return branchId;
        }
        return branchQuery.listActive().stream()
                .findFirst()
                .map(Branch::getId)
                .orElseThrow(() -> new DomainException("BRANCH_NOT_FOUND", HttpStatus.NOT_FOUND, "Branch not found"));
    }

    /** Loads branch availability for a page of products using one grouped stock query. */
    private Map<Long, BigDecimal> availabilityByProduct(List<Product> products, Long branchId) {
        if (products.isEmpty()) {
            return Map.of();
        }
        List<Long> productIds = products.stream().map(Product::getId).toList();
        return inventoryQuery.calculateAvailableQuantityByProductIds(productIds, branchId);
    }

    /** Normalizes optional text fields before persistence. */
    private String normalizeBlank(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    /** Maps an entity into a table row DTO without public stock information. */
    private ProductSummaryDto toSummaryDto(Product product) {
        return toSummaryDto(product, null);
    }

    /** Maps an entity into a public-store table row DTO with branch availability. */
    private ProductSummaryDto toSummaryDto(Product product, BigDecimal availableStock) {
        return new ProductSummaryDto(
                product.getId(),
                product.getName(),
                product.getBrandName(),
                product.getBarcode(),
                product.getCategory().getId(),
                product.getCategory().getName(),
                product.getSalePrice(),
                product.getMinimumStock(),
                product.getImageUrl(),
                product.getOnlineStatus(),
                availableStock);
    }

    /** Maps an entity into the edit/detail DTO without public stock information. */
    private ProductDetailDto toDetailDto(Product product) {
        return toDetailDto(product, null);
    }

    /** Maps an entity into the public-store detail DTO with branch availability. */
    private ProductDetailDto toDetailDto(Product product, BigDecimal availableStock) {
        return new ProductDetailDto(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getBrandName(),
                product.getBarcode(),
                product.getCategory().getId(),
                product.getCategory().getName(),
                product.getSalePrice(),
                product.getMinimumStock(),
                product.getImageUrl(),
                product.getOnlineStatus(),
                availableStock);
    }
}
