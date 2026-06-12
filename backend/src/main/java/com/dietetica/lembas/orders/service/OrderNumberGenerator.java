package com.dietetica.lembas.orders.service;

import com.dietetica.lembas.orders.model.OrderType;
import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Generates human-readable, unique order numbers.
 *
 * <p>Format: {@code <PREFIX>-YYYYMMDD-NNNNNN} where the trailing sequence comes
 * from the {@code order_number_seq} PostgreSQL sequence. The date part is
 * informational; uniqueness is guaranteed by the sequence. Using a database
 * sequence keeps the generator safe under concurrent inserts without requiring
 * application-level locking.</p>
 *
 * <p>The {@link EntityManager} is resolved lazily through an {@link ObjectProvider}
 * so the bean can be constructed in JPA-less contexts (smoke tests, slice
 * tests). Calls to {@link #next(OrderType)} outside an active transaction will
 * fail because PostgreSQL sequence access requires one.</p>
 */
@Component
public class OrderNumberGenerator {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final Clock clock;
    private final ObjectProvider<EntityManager> entityManagerProvider;

    public OrderNumberGenerator(Clock clock, ObjectProvider<EntityManager> entityManagerProvider) {
        this.clock = clock;
        this.entityManagerProvider = entityManagerProvider;
    }

    /**
     * Builds the next order number for the given channel.
     *
     * @param type POS or ONLINE
     * @return a fresh, unique order number
     */
    public String next(OrderType type) {
        long sequence = nextSequenceValue();
        String datePart = LocalDate.now(clock).format(DATE_FORMAT);
        return String.format("%s-%s-%06d", prefixFor(type), datePart, sequence);
    }

    /** Returns the canonical short prefix for a channel. */
    String prefixFor(OrderType type) {
        return switch (type) {
            case ONLINE -> "ON";
            case POS -> "POS";
        };
    }

    private long nextSequenceValue() {
        EntityManager em = entityManagerProvider.getIfAvailable();
        if (em == null) {
            throw new IllegalStateException(
                    "EntityManager is not available; OrderNumberGenerator must run inside an active persistence context");
        }
        Object value = em.createNativeQuery("SELECT nextval('order_number_seq')")
                .getSingleResult();
        if (value instanceof Number number) {
            return number.longValue();
        }
        throw new IllegalStateException(
                "Unexpected value from nextval('order_number_seq'): " + value);
    }
}
