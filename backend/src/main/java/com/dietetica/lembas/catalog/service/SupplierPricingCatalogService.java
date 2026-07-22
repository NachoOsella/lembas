package com.dietetica.lembas.catalog.service;

import com.dietetica.lembas.catalog.api.SupplierPricingCatalog;
import com.dietetica.lembas.catalog.model.Category;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import com.dietetica.lembas.catalog.model.ProductSalePriceHistory;
import com.dietetica.lembas.catalog.repository.CategoryRepository;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.catalog.repository.ProductSalePriceHistoryRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.User;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Catalog-owned implementation of supplier price-batch product and pricing operations. */
@Service
public class SupplierPricingCatalogService implements SupplierPricingCatalog {
    private static final String SOURCE_PRICE_BATCH = "PRICE_BATCH";
    private static final String REFERENCE_PRICE_BATCH = "PRICE_UPDATE_BATCH";

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductSalePriceHistoryRepository salePriceHistoryRepository;

    public SupplierPricingCatalogService(
            ProductRepository productRepository,
            CategoryRepository categoryRepository,
            ProductSalePriceHistoryRepository salePriceHistoryRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.salePriceHistoryRepository = salePriceHistoryRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Product> findActiveProductByBarcode(String barcode) {
        return productRepository.findByBarcodeIgnoreCaseAndActiveTrue(barcode);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Product> findActiveProductsByExactName(String name) {
        return productRepository.findActiveByNameIgnoreCase(name);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Product> findActiveProductById(Long productId) {
        return productRepository.findByIdAndActiveTrue(productId);
    }

    @Override
    @Transactional
    public Product createDraftProductForSupplierPriceBatch(String name, String barcode, BigDecimal salePrice) {
        Product product = new Product();
        product.setCategory(defaultCategory());
        product.setName(name);
        product.setBarcode(barcode);
        product.setSalePrice(salePrice);
        product.setOnlineStatus(ProductOnlineStatus.DRAFT);
        return productRepository.save(product);
    }

    @Override
    @Transactional
    public void changeSalePriceForSupplierPriceBatch(
            Product product, BigDecimal salePrice, Long batchId, User appliedBy) {
        BigDecimal oldPrice = product.getSalePrice();
        product.setSalePrice(salePrice);
        salePriceHistoryRepository.save(salePriceHistory(product, oldPrice, salePrice, batchId, appliedBy));
    }

    @Override
    @Transactional
    public void recordInitialSalePriceForSupplierPriceBatch(
            Product product, BigDecimal salePrice, Long batchId, User appliedBy) {
        salePriceHistoryRepository.save(salePriceHistory(product, null, salePrice, batchId, appliedBy));
    }

    /** Preserves the existing first-category fallback for supplier-created products. */
    private Category defaultCategory() {
        return categoryRepository.findAll(PageRequest.of(0, 1)).stream()
                .findFirst()
                .orElseThrow(() -> new DomainException(
                        "CATEGORY_NOT_FOUND",
                        HttpStatus.NOT_FOUND,
                        "Create a category before importing new supplier products"));
    }

    /** Builds catalog-owned audit history for a supplier price-batch change. */
    private ProductSalePriceHistory salePriceHistory(
            Product product, BigDecimal oldPrice, BigDecimal newPrice, Long batchId, User appliedBy) {
        ProductSalePriceHistory history = new ProductSalePriceHistory();
        history.setProduct(product);
        history.setOldPrice(oldPrice);
        history.setNewPrice(newPrice);
        history.setSource(SOURCE_PRICE_BATCH);
        history.setReason("Supplier price update batch");
        history.setReferenceType(REFERENCE_PRICE_BATCH);
        history.setReferenceId(batchId);
        history.setCreatedByUser(appliedBy);
        return history;
    }
}
