package com.dietetica.lembas.suppliers.repository;

import com.dietetica.lembas.suppliers.model.PriceUpdateBatchItem;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Repository for preview rows inside price update batches. */
public interface PriceUpdateBatchItemRepository extends JpaRepository<PriceUpdateBatchItem, Long> {
    /** Finds one item constrained to its parent batch. */
    @EntityGraph(attributePaths = {"batch", "product", "supplierProduct", "supplierProduct.product"})
    Optional<PriceUpdateBatchItem> findByIdAndBatchId(Long id, Long batchId);
}
