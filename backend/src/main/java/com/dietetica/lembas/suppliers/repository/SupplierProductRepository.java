package com.dietetica.lembas.suppliers.repository;

import com.dietetica.lembas.suppliers.model.SupplierProduct;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/** Repository for product-supplier associations and replacement costs. */
public interface SupplierProductRepository extends JpaRepository<SupplierProduct, Long> {
    @EntityGraph(attributePaths = {"product", "product.category", "supplier"})
    Optional<SupplierProduct> findByIdAndActiveTrue(Long id);

    boolean existsByProductIdAndSupplierIdAndActiveTrue(Long productId, Long supplierId);

    boolean existsByProductIdAndSupplierIdAndActiveTrueAndIdNot(Long productId, Long supplierId, Long id);

    @EntityGraph(attributePaths = {"product", "product.category", "supplier"})
    Optional<SupplierProduct> findBySupplierIdAndSupplierSkuIgnoreCaseAndActiveTrue(Long supplierId, String supplierSku);

    @EntityGraph(attributePaths = {"product", "product.category", "supplier"})
    Optional<SupplierProduct> findByProductIdAndSupplierIdAndActiveTrue(Long productId, Long supplierId);

    /** Lists active supplier products filtered by product, supplier, and text search. */
    @EntityGraph(attributePaths = {"product", "product.category", "supplier"})
    @Query("""
            select sp from SupplierProduct sp
            join sp.product p
            join sp.supplier s
            where sp.active = true
              and p.active = true
              and s.active = true
              and (:productId is null or p.id = :productId)
              and (:supplierId is null or s.id = :supplierId)
              and (lower(p.name) like concat('%', :search, '%')
                   or lower(s.name) like concat('%', :search, '%')
                   or lower(coalesce(sp.supplierSku, '')) like concat('%', :search, '%')
                   or lower(coalesce(p.barcode, '')) like concat('%', :search, '%'))
            """)
    Page<SupplierProduct> searchActive(
            @Param("productId") Long productId,
            @Param("supplierId") Long supplierId,
            @Param("search") String search,
            Pageable pageable
    );

    /** Lists active supplier products filtered by product and supplier without text search. */
    @EntityGraph(attributePaths = {"product", "product.category", "supplier"})
    @Query("""
            select sp from SupplierProduct sp
            join sp.product p
            join sp.supplier s
            where sp.active = true
              and p.active = true
              and s.active = true
              and (:productId is null or p.id = :productId)
              and (:supplierId is null or s.id = :supplierId)
            """)
    Page<SupplierProduct> findByActive(
            @Param("productId") Long productId,
            @Param("supplierId") Long supplierId,
            Pageable pageable
    );
}
