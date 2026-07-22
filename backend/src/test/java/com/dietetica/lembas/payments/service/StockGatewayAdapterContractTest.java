package com.dietetica.lembas.payments.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dietetica.lembas.inventory.api.StockCommand;
import com.dietetica.lembas.inventory.api.StockCommand.OnlineOrderDeductionOutcome;
import com.dietetica.lembas.inventory.service.InventoryStockDeductionAdapter;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.shared.exception.DomainException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

/** Contract tests for the inventory implementation consumed by payment webhooks. */
class StockGatewayAdapterContractTest {

    private final StockCommand stockCommand = mock(StockCommand.class);
    private final StockDeductionGateway gateway = new InventoryStockDeductionAdapter(stockCommand);

    @Test
    void insufficientStockOutcomeMapsToConflictWithoutAnException() {
        Order order = order();
        when(stockCommand.tryDeductForOnlineOrder(7L)).thenReturn(OnlineOrderDeductionOutcome.INSUFFICIENT_STOCK);

        assertThat(gateway.deductForOrder(order)).isFalse();
    }

    @Test
    void successfulDeductionOutcomeMapsToSuccess() {
        Order order = order();
        when(stockCommand.tryDeductForOnlineOrder(7L)).thenReturn(OnlineOrderDeductionOutcome.DEDUCTED);

        assertThat(gateway.deductForOrder(order)).isTrue();
    }

    @Test
    void unexpectedDomainFailurePropagates() {
        Order order = order();
        org.mockito.Mockito.doThrow(new DomainException("PRODUCT_NOT_FOUND", HttpStatus.NOT_FOUND, "Product not found"))
                .when(stockCommand)
                .tryDeductForOnlineOrder(7L);

        assertThatThrownBy(() -> gateway.deductForOrder(order))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("PRODUCT_NOT_FOUND");
    }

    @Test
    void unexpectedRuntimeFailurePropagates() {
        Order order = order();
        org.mockito.Mockito.doThrow(new IllegalStateException("database failure"))
                .when(stockCommand)
                .tryDeductForOnlineOrder(7L);

        assertThatThrownBy(() -> gateway.deductForOrder(order))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("database failure");
    }

    @Test
    void reversalDelegatesToInventoryCommandBoundary() {
        when(stockCommand.reverseMovementsForOrder(7L)).thenReturn(2);

        assertThat(gateway.reverseForOrder(7L)).isEqualTo(2);
        verify(stockCommand).reverseMovementsForOrder(7L);
    }

    private static Order order() {
        Order order = new Order();
        order.setId(7L);
        return order;
    }
}
