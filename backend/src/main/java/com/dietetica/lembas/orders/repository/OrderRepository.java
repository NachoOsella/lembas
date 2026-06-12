package com.dietetica.lembas.orders.repository;

import com.dietetica.lembas.orders.model.Order;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/** Repository for the unified {@link Order} aggregate. */
public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {

    /** Returns true when an order with the given human-readable number already exists. */
    boolean existsByOrderNumber(String orderNumber);

    /** Looks up an order by its unique order number. */
    Optional<Order> findByOrderNumber(String orderNumber);

    /** Fetches an order with the data needed for detail pages and transition rules. */
    @EntityGraph(attributePaths = {"branch", "customerUser", "createdByUser", "items", "items.product"})
    @Query("select o from Order o where o.id = :id")
    Optional<Order> findWithItemsById(@Param("id") Long id);
}
