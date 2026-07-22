package com.dietetica.lembas.catalog.api;

import com.dietetica.lembas.catalog.model.Product;
import java.util.Optional;

/** Read access to catalog products needed by other feature modules. */
public interface ProductLookup {

    /** Finds a product by its identifier regardless of operational status. */
    Optional<Product> findById(Long productId);

    /** Finds an active product by its identifier. */
    Optional<Product> findActiveById(Long productId);

    /** Finds an active product published in the online store by its identifier. */
    Optional<Product> findPublishedById(Long productId);

    /** Finds an active product by its barcode. */
    Optional<Product> findActiveByBarcode(String barcode);
}
