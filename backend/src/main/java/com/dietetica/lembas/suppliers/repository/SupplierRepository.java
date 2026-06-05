package com.dietetica.lembas.suppliers.repository;

import com.dietetica.lembas.suppliers.model.Supplier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/** Repository for supplier search and uniqueness checks. */
public interface SupplierRepository extends JpaRepository<Supplier, Long> {
    Optional<Supplier> findByIdAndActiveTrue(Long id);

    boolean existsByCuitIgnoreCaseAndActiveTrue(String cuit);

    boolean existsByCuitIgnoreCaseAndActiveTrueAndIdNot(String cuit, Long id);

    /** Searches active suppliers by name, contact, email, phone, or CUIT. */
    @Query("""
            select s from Supplier s
            where s.active = true
              and lower(s.name) like concat('%', :search, '%')
               or lower(coalesce(s.contactName, '')) like concat('%', :search, '%')
               or lower(coalesce(s.email, '')) like concat('%', :search, '%')
               or lower(coalesce(s.phone, '')) like concat('%', :search, '%')
               or lower(coalesce(s.cuit, '')) like concat('%', :search, '%')
            """)
    Page<Supplier> searchActive(@Param("search") String search, Pageable pageable);

    /** Returns all active suppliers when there is no search text. */
    Page<Supplier> findByActiveTrue(Pageable pageable);
}
