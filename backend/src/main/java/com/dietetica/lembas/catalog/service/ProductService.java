package com.dietetica.lembas.catalog.service;

import com.dietetica.lembas.catalog.dto.ProductDetailDto;
import com.dietetica.lembas.catalog.dto.ProductRequest;
import com.dietetica.lembas.catalog.dto.ProductSummaryDto;
import com.dietetica.lembas.catalog.model.Category;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import com.dietetica.lembas.catalog.repository.CategoryRepository;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

/** Application service for admin product catalog management. */
@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    public ProductService(ProductRepository productRepository, CategoryRepository categoryRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
    }

    /** Lists active products with optional table filters. */
    @Transactional(readOnly = true)
    public Page<ProductSummaryDto> listAdminProducts(String search, Long categoryId, ProductOnlineStatus status, Pageable pageable) {
        String normalizedSearch = search == null || search.isBlank() ? null : search.trim().toLowerCase(Locale.ROOT);
        return productRepository.searchAdminProducts(normalizedSearch, categoryId, status, pageable)
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

    /** Soft-deletes a product so future stock/order relations can keep history. */
    @Transactional
    public void delete(Long id) {
        Product product = findActiveById(id);
        product.setActive(false);
    }

    /** Copies validated request fields into the entity. */
    private void applyRequest(Product product, ProductRequest request) {
        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new DomainException("CATEGORY_NOT_FOUND", HttpStatus.NOT_FOUND, "Category not found"));
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
            throw new DomainException("PRODUCT_BARCODE_DUPLICATED", HttpStatus.CONFLICT, "Product barcode already exists");
        }
    }

    /** Finds an active product or raises the uniform not-found error. */
    private Product findActiveById(Long id) {
        return productRepository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new DomainException("PRODUCT_NOT_FOUND", HttpStatus.NOT_FOUND, "Product not found"));
    }

    /** Normalizes optional text fields before persistence. */
    private String normalizeBlank(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    /** Maps an entity into a table row DTO. */
    private ProductSummaryDto toSummaryDto(Product product) {
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
                product.getOnlineStatus()
        );
    }

    /** Maps an entity into the edit/detail DTO. */
    private ProductDetailDto toDetailDto(Product product) {
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
                product.getOnlineStatus()
        );
    }
}
