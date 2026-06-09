package com.dietetica.lembas.catalog.repository;

import com.dietetica.lembas.catalog.model.ProductSalePriceHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/** Repository for product sale price history rows. */
public interface ProductSalePriceHistoryRepository extends JpaRepository<ProductSalePriceHistory, Long> {
    /** Lists price history rows for one product, newest first. */
    Page<ProductSalePriceHistory> findByProductIdOrderByValidFromDesc(Long productId, Pageable pageable);
}
