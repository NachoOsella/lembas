package com.dietetica.lembas.catalog.repository;

import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/** Repository for admin catalog product queries. */
public interface ProductRepository extends JpaRepository<Product, Long> {

    boolean existsByBarcodeIgnoreCaseAndActiveTrue(String barcode);

    boolean existsByBarcodeIgnoreCaseAndActiveTrueAndIdNot(String barcode, Long id);

    @EntityGraph(attributePaths = "category")
    Optional<Product> findByIdAndActiveTrue(Long id);

    @EntityGraph(attributePaths = "category")
    @Query("""
            select p from Product p
            join p.category c
            where p.active = true
              and (:search is null or lower(p.name) like concat('%', cast(:search as string), '%')
                   or lower(coalesce(p.brandName, '')) like concat('%', cast(:search as string), '%')
                   or lower(coalesce(p.barcode, '')) like concat('%', cast(:search as string), '%')
                   or lower(c.name) like concat('%', cast(:search as string), '%'))
              and (:categoryId is null or c.id = :categoryId)
              and (:status is null or p.onlineStatus = :status)
            """)
    Page<Product> searchAdminProducts(
            @Param("search") String search,
            @Param("categoryId") Long categoryId,
            @Param("status") ProductOnlineStatus status,
            Pageable pageable
    );

    // ---------------------------------------------------------------------------
    // Public store queries
    // ---------------------------------------------------------------------------

    @EntityGraph(attributePaths = "category")
    @Query("""
            select p from Product p
            join p.category c
            where p.active = true
              and p.onlineStatus = com.dietetica.lembas.catalog.model.ProductOnlineStatus.PUBLISHED
              and (:search is null or lower(p.name) like concat('%', cast(:search as string), '%')
                   or lower(coalesce(p.description, '')) like concat('%', cast(:search as string), '%')
                   or lower(coalesce(p.brandName, '')) like concat('%', cast(:search as string), '%')
                   or lower(coalesce(p.barcode, '')) like concat('%', cast(:search as string), '%')
                   or lower(c.name) like concat('%', cast(:search as string), '%'))
              and (:categoryId is null or c.id = :categoryId)
            """)
    Page<Product> searchStoreProducts(
            @Param("search") String search,
            @Param("categoryId") Long categoryId,
            Pageable pageable
    );

    @EntityGraph(attributePaths = "category")
    Optional<Product> findByIdAndActiveTrueAndOnlineStatus(Long id, ProductOnlineStatus onlineStatus);

    // ---------------------------------------------------------------------------
    // Random / featured products
    // ---------------------------------------------------------------------------

    // TODO: Replace random selection with metric-based ranking (views, sales, recency)
    //       once analytics events are captured in the products table.
    @EntityGraph(attributePaths = "category")
    @Query("""
            select p from Product p
            where p.active = true
              and p.onlineStatus = com.dietetica.lembas.catalog.model.ProductOnlineStatus.PUBLISHED
            order by function('RANDOM')
            """)
    List<Product> findRandomPublishedProducts(Pageable pageable);
}
