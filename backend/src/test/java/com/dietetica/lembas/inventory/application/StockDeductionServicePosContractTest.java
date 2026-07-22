package com.dietetica.lembas.inventory.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.catalog.api.ProductLookup;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.inventory.dto.DeductionPlan;
import com.dietetica.lembas.inventory.dto.DeductionPlan.DeductionEntry;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.inventory.model.StockLotStatus;
import com.dietetica.lembas.inventory.model.StockMovement;
import com.dietetica.lembas.inventory.model.StockMovementType;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.inventory.repository.StockMovementRepository;
import com.dietetica.lembas.inventory.service.FefoStockDeductionPolicy;
import com.dietetica.lembas.orders.api.OrderQuery;
import com.dietetica.lembas.orders.model.FulfillmentType;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderItem;
import com.dietetica.lembas.orders.model.OrderStatus;
import com.dietetica.lembas.orders.model.OrderType;
import com.dietetica.lembas.shared.branch.api.BranchQuery;
import com.dietetica.lembas.shared.branch.model.Branch;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/** Characterizes the POS-specific inventory contract without involving POS persistence details. */
@ExtendWith(MockitoExtension.class)
class StockDeductionServicePosContractTest {

    @Mock
    private StockLotRepository stockLotRepository;

    @Mock
    private StockMovementRepository stockMovementRepository;

    @Mock
    private ProductLookup productLookup;

    @Mock
    private BranchQuery branchQuery;

    @Mock
    private OrderQuery orderQuery;

    @Mock
    private SecurityContextHelper securityContextHelper;

    @Mock
    private FefoStockDeductionPolicy fefoPolicy;

    private StockDeductionService service;

    @BeforeEach
    void setUp() {
        service = new StockDeductionService(
                stockLotRepository,
                stockMovementRepository,
                productLookup,
                branchQuery,
                orderQuery,
                securityContextHelper,
                fefoPolicy);
    }

    @Test
    void deductForPosOrder_appliesFefoAndRecordsLinkedDepletedLotMovement() {
        Branch branch = branch(20L);
        Product product = product(10L);
        Order order = posOrder(30L, branch, product, new BigDecimal("2.000"));
        StockLot lot = lot(40L, product, branch, new BigDecimal("2.000"));
        DeductionPlan plan = new DeductionPlan(
                List.of(new DeductionEntry(
                        lot.getId(), new BigDecimal("2.000"), new BigDecimal("2.000"), BigDecimal.ZERO)),
                new BigDecimal("2.000"),
                new BigDecimal("2.000"),
                true);

        when(orderQuery.findWithItemsById(order.getId())).thenReturn(Optional.of(order));
        when(productLookup.findActiveById(product.getId())).thenReturn(Optional.of(product));
        when(stockLotRepository.findAvailableLotsForUpdate(product.getId(), branch.getId()))
                .thenReturn(List.of(lot));
        when(fefoPolicy.plan(anyList(), any())).thenReturn(plan);

        service.deductForPosOrder(order.getId());

        assertThat(lot.getQuantityAvailable()).isEqualByComparingTo("0.000");
        assertThat(lot.getStatus()).isEqualTo(StockLotStatus.DEPLETED);
        ArgumentCaptor<StockMovement> movementCaptor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository).save(movementCaptor.capture());
        StockMovement movement = movementCaptor.getValue();
        assertThat(movement.getType()).isEqualTo(StockMovementType.POS_SALE);
        assertThat(movement.getQuantity()).isEqualByComparingTo("-2.000");
        assertThat(movement.getUnitCostSnapshot()).isEqualByComparingTo("11.50");
        assertThat(movement.getOrderId()).isEqualTo(order.getId());
        assertThat(movement.getReferenceType()).isEqualTo("ORDER");
        assertThat(movement.getReferenceId()).isEqualTo(order.getId());
        assertThat(movement.getReason()).isEqualTo("POS sale deduction");
        verify(stockLotRepository).flush();
        verify(stockLotRepository, never()).findById(any());
        verify(stockLotRepository, never()).findByIdForUpdate(any());
    }

    private static Order posOrder(Long id, Branch branch, Product product, BigDecimal quantity) {
        Order order = new Order();
        order.setId(id);
        order.setOrderNumber("PS-1");
        order.setType(OrderType.POS);
        order.setStatus(OrderStatus.PAID);
        order.setFulfillmentType(FulfillmentType.PICKUP);
        order.setBranch(branch);
        order.setSubtotal(new BigDecimal("100.00"));
        order.setDiscountTotal(BigDecimal.ZERO);
        order.setTotal(new BigDecimal("100.00"));

        OrderItem item = new OrderItem();
        item.setProduct(product);
        item.setQuantity(quantity);
        item.setUnitPrice(new BigDecimal("100.00"));
        item.setSubtotalAmount(new BigDecimal("100.00"));
        item.setProductNameSnapshot("Product");
        order.addItem(item);
        return order;
    }

    private static Product product(Long id) {
        Product product = new Product();
        product.setId(id);
        product.setName("Product");
        product.setActive(true);
        return product;
    }

    private static StockLot lot(Long id, Product product, Branch branch, BigDecimal quantity) {
        StockLot lot = new StockLot();
        lot.setId(id);
        lot.setProduct(product);
        lot.setBranch(branch);
        lot.setQuantityAvailable(quantity);
        lot.setUnitCost(new BigDecimal("11.50"));
        lot.setStatus(StockLotStatus.ACTIVE);
        return lot;
    }

    private static Branch branch(Long id) {
        try {
            var constructor = Branch.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Branch branch = constructor.newInstance();
            ReflectionTestUtils.setField(branch, "id", id);
            ReflectionTestUtils.setField(branch, "name", "Centro");
            ReflectionTestUtils.setField(branch, "active", true);
            return branch;
        } catch (ReflectiveOperationException exception) {
            throw new IllegalStateException("Failed to build branch fixture", exception);
        }
    }
}
