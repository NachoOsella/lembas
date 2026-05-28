package com.dietetica.lembas.catalog.repository;

import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
              and (:search is null or lower(p.name) like concat('%', :search, '%')
                   or lower(coalesce(p.barcode, '')) like concat('%', :search, '%'))
              and (:categoryId is null or c.id = :categoryId)
              and (:status is null or p.onlineStatus = :status)
            """)
    Page<Product> searchAdminProducts(
            @Param("search") String search,
            @Param("categoryId") Long categoryId,
            @Param("status") ProductOnlineStatus status,
            Pageable pageable
    );
}
