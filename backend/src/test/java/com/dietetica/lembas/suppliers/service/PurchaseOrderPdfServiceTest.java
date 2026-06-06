package com.dietetica.lembas.suppliers.service;

import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.suppliers.model.PurchaseOrder;
import com.dietetica.lembas.suppliers.model.PurchaseOrderItem;
import com.dietetica.lembas.suppliers.model.PurchaseOrderStatus;
import com.dietetica.lembas.suppliers.model.Supplier;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Unit tests for on-demand purchase order PDF generation. */
class PurchaseOrderPdfServiceTest {
    @Test
    void generateShouldReturnPdfBytes() {
        PurchaseOrderPdfService service = new PurchaseOrderPdfService(
                new BusinessPdfProperties("Dietetica Lembas", "Calle 123", "351", "compras@lembas.test", "20-123")
        );

        byte[] pdf = service.generate(order());

        assertThat(pdf).isNotEmpty();
        assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");
    }

    /** Creates a minimal purchase order for PDF rendering. */
    private PurchaseOrder order() {
        Supplier supplier = new Supplier();
        supplier.setId(1L);
        supplier.setName("Distribuidora");
        Product product = new Product();
        product.setId(2L);
        product.setName("Granola");
        Branch branch = mock(Branch.class);
        when(branch.getId()).thenReturn(3L);
        when(branch.getName()).thenReturn("Centro");

        PurchaseOrder order = new PurchaseOrder();
        order.setId(10L);
        order.setSupplier(supplier);
        order.setBranch(branch);
        order.setStatus(PurchaseOrderStatus.CONFIRMED);
        order.setOrderDate(OffsetDateTime.parse("2026-06-05T10:00:00Z"));
        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setProduct(product);
        item.setQuantityOrdered(BigDecimal.valueOf(2));
        item.setUnitCost(BigDecimal.valueOf(1500));
        item.setSubtotal(BigDecimal.valueOf(3000));
        order.addItem(item);
        return order;
    }
}
