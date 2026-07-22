package com.dietetica.lembas.orders.repository;

import com.dietetica.lembas.orders.model.Order;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Repository for the unified {@link Order} aggregate. */
public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {

    /** Returns true when an order with the given human-readable number already exists. */
    boolean existsByOrderNumber(String orderNumber);

    /** Looks up an order by its unique order number. */
    Optional<Order> findByOrderNumber(String orderNumber);

    /** Locks one order row before a lifecycle operation reads or changes its state. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Order o where o.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") Long id);

    /** Fetches an order with the data needed for detail pages and transition rules. */
    @EntityGraph(attributePaths = {"branch", "customerUser", "createdByUser", "items", "items.product"})
    @Query("select o from Order o where o.id = :id")
    Optional<Order> findWithItemsById(@Param("id") Long id);

    /** Lists a customer's orders by creation date, newest first. */
    List<Order> findByCustomerUserIdOrderByCreatedAtDesc(Long customerUserId);
}
