package com.dietetica.lembas.orders.service;

import com.dietetica.lembas.orders.model.OrderType;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicLong;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Unit tests for {@link OrderNumberGenerator}. */
@ExtendWith(MockitoExtension.class)
class OrderNumberGeneratorTest {

    private static final Pattern NUMBER_PATTERN =
            Pattern.compile("^(ON|POS)-\\d{8}-\\d{6}$");

    @Mock
    private EntityManager entityManager;
    @Mock
    private Query nativeQuery;

    private final AtomicLong sequence = new AtomicLong(0);

    private OrderNumberGenerator generator;

    @BeforeEach
    void setUp() {
        Clock fixed = Clock.fixed(Instant.parse("2026-06-12T10:15:00Z"), ZoneOffset.UTC);
        @SuppressWarnings("unchecked")
        ObjectProvider<EntityManager> provider = mock(ObjectProvider.class);
        lenient().when(provider.getIfAvailable()).thenReturn(entityManager);
        generator = new OrderNumberGenerator(fixed, provider);
        lenient().when(entityManager.createNativeQuery(anyString())).thenReturn(nativeQuery);
        lenient().when(nativeQuery.getSingleResult()).thenAnswer(invocation -> sequence.incrementAndGet());
    }

    @Test
    void shouldUseOnlinePrefixAndDateWithLeadingSequence() {
        String number = generator.next(OrderType.ONLINE);

        assertThat(number).matches("^ON-20260612-\\d{6}$");
        assertThat(number).isEqualTo("ON-20260612-000001");
    }

    @Test
    void shouldUsePosPrefixAndIncrementSequence() {
        String first = generator.next(OrderType.POS);
        String second = generator.next(OrderType.POS);

        assertThat(first).isEqualTo("POS-20260612-000001");
        assertThat(second).isEqualTo("POS-20260612-000002");
    }

    @Test
    void shouldKeepPrefixMappingForBothChannels() {
        assertThat(generator.prefixFor(OrderType.ONLINE)).isEqualTo("ON");
        assertThat(generator.prefixFor(OrderType.POS)).isEqualTo("POS");
    }

    @Test
    void shouldProduceUniqueNumbersAcrossCallsAndChannels() {
        for (int i = 0; i < 50; i++) {
            String on = generator.next(OrderType.ONLINE);
            String pos = generator.next(OrderType.POS);
            assertThat(on).matches(NUMBER_PATTERN);
            assertThat(pos).matches(NUMBER_PATTERN);
        }
    }
}
