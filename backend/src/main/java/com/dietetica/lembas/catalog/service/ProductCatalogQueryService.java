package com.dietetica.lembas.catalog.service;

import com.dietetica.lembas.catalog.api.ProductLookup;
import com.dietetica.lembas.catalog.api.ProductSearch;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Catalog-owned implementation of product lookup and published-product search contracts. */
@Service
@Transactional(readOnly = true)
public class ProductCatalogQueryService implements ProductLookup, ProductSearch {

    private final ProductRepository productRepository;

    public ProductCatalogQueryService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    public Optional<Product> findById(Long productId) {
        return productRepository.findById(productId);
    }

    @Override
    public Optional<Product> findActiveById(Long productId) {
        return productRepository.findByIdAndActiveTrue(productId);
    }

    @Override
    public Optional<Product> findPublishedById(Long productId) {
        return productRepository.findByIdAndActiveTrueAndOnlineStatus(productId, ProductOnlineStatus.PUBLISHED);
    }

    @Override
    public Optional<Product> findActiveByBarcode(String barcode) {
        return productRepository.findByBarcodeIgnoreCaseAndActiveTrue(barcode);
    }

    @Override
    public Page<Product> searchPublished(String search, Long categoryId, Pageable pageable) {
        return productRepository.searchStoreProducts(search, categoryId, pageable);
    }
}
