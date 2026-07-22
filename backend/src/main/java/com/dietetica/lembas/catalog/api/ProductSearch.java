package com.dietetica.lembas.catalog.api;

import com.dietetica.lembas.catalog.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/** Published catalog search contract for consumers outside the catalog module. */
public interface ProductSearch {

    /** Searches active published products using the public-store criteria. */
    Page<Product> searchPublished(String search, Long categoryId, Pageable pageable);
}
