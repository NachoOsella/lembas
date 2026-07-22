package com.dietetica.lembas.suppliers.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.dietetica.lembas.AbstractIntegrationTest;
import com.dietetica.lembas.catalog.model.Category;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import com.dietetica.lembas.catalog.repository.CategoryRepository;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.suppliers.dto.PurchaseReceiptDto;
import com.dietetica.lembas.suppliers.dto.PurchaseReceiptItemRequest;
import com.dietetica.lembas.suppliers.dto.PurchaseReceiptRequest;
import com.dietetica.lembas.suppliers.model.PurchaseOrder;
import com.dietetica.lembas.suppliers.model.PurchaseOrderItem;
import com.dietetica.lembas.suppliers.model.PurchaseOrderStatus;
import com.dietetica.lembas.suppliers.model.Supplier;
import com.dietetica.lembas.suppliers.repository.PurchaseOrderRepository;
import com.dietetica.lembas.suppliers.repository.PurchaseReceiptItemRepository;
import com.dietetica.lembas.suppliers.repository.SupplierRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.support.TransactionTemplate;

/** PostgreSQL concurrency coverage for serialized purchase-receipt confirmation. */
class PurchaseReceiptConcurrencyIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private PurchaseReceiptService purchaseReceiptService;

    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;

    @Autowired
    private PurchaseReceiptItemRepository purchaseReceiptItemRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private TransactionTemplate transactionTemplate;

    @Autowired
    private EntityManager entityManager;

    @Test
    void concurrentConfirmationsCannotOverReceiveThePurchaseOrder() throws Exception {
        Fixture fixture = persistSentOrder(new BigDecimal("10.000"));
        CountDownLatch firstReceiptPrepared = new CountDownLatch(1);
        CountDownLatch releaseFirstCommit = new CountDownLatch(1);
        CountDownLatch secondOrderLockAttempted = new CountDownLatch(1);
        CountDownLatch secondOrderLockAcquired = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            Future<PurchaseReceiptDto> firstReceipt = executor.submit(() -> transactionTemplate.execute(status -> {
                PurchaseReceiptDto receipt = purchaseReceiptService.confirm(receiptRequest(fixture, "6.000", "FIRST"));
                firstReceiptPrepared.countDown();
                await(releaseFirstCommit);
                return receipt;
            }));
            await(firstReceiptPrepared);

            Future<Throwable> secondFailure = executor.submit(() -> captureFailure(() -> {
                secondOrderLockAttempted.countDown();
                transactionTemplate.executeWithoutResult(status -> {
                    purchaseOrderRepository.findByIdForUpdate(fixture.orderId()).orElseThrow();
                    secondOrderLockAcquired.countDown();
                    purchaseReceiptService.confirm(receiptRequest(fixture, "6.000", "SECOND"));
                });
            }));
            await(secondOrderLockAttempted);
            assertStillWaiting(secondOrderLockAcquired);
            releaseFirstCommit.countDown();

            assertThat(firstReceipt.get(5, TimeUnit.SECONDS).purchaseOrderStatus())
                    .isEqualTo("PARTIALLY_RECEIVED");
            assertDomainCode(secondFailure.get(5, TimeUnit.SECONDS), "PURCHASE_RECEIPT_OVER_RECEIVED");
            assertThat(purchaseReceiptItemRepository.sumConfirmedQuantityByPurchaseOrderItemId(fixture.itemId()))
                    .isEqualByComparingTo("6.000");
            assertThat(currentOrderStatus(fixture.orderId())).isEqualTo(PurchaseOrderStatus.PARTIALLY_RECEIVED);
            assertThat(receiptCount(fixture.orderId())).isEqualTo(1L);
        } finally {
            releaseFirstCommit.countDown();
            shutDown(executor);
        }
    }

    @Test
    void secondSerializedConfirmationUsesCurrentTotalsAndMarksOrderReceived() throws Exception {
        Fixture fixture = persistSentOrder(new BigDecimal("10.000"));
        CountDownLatch firstReceiptPrepared = new CountDownLatch(1);
        CountDownLatch releaseFirstCommit = new CountDownLatch(1);
        CountDownLatch secondOrderLockAttempted = new CountDownLatch(1);
        CountDownLatch secondOrderLockAcquired = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        try {
            Future<PurchaseReceiptDto> firstReceipt = executor.submit(() -> transactionTemplate.execute(status -> {
                PurchaseReceiptDto receipt = purchaseReceiptService.confirm(receiptRequest(fixture, "6.000", "FIRST"));
                firstReceiptPrepared.countDown();
                await(releaseFirstCommit);
                return receipt;
            }));
            await(firstReceiptPrepared);

            Future<PurchaseReceiptDto> secondReceipt = executor.submit(() -> {
                secondOrderLockAttempted.countDown();
                return transactionTemplate.execute(status -> {
                    purchaseOrderRepository.findByIdForUpdate(fixture.orderId()).orElseThrow();
                    secondOrderLockAcquired.countDown();
                    return purchaseReceiptService.confirm(receiptRequest(fixture, "4.000", "SECOND"));
                });
            });
            await(secondOrderLockAttempted);
            assertStillWaiting(secondOrderLockAcquired);
            releaseFirstCommit.countDown();

            assertThat(firstReceipt.get(5, TimeUnit.SECONDS).purchaseOrderStatus())
                    .isEqualTo("PARTIALLY_RECEIVED");
            assertThat(secondReceipt.get(5, TimeUnit.SECONDS).purchaseOrderStatus())
                    .isEqualTo("RECEIVED");
            assertThat(purchaseReceiptItemRepository.sumConfirmedQuantityByPurchaseOrderItemId(fixture.itemId()))
                    .isEqualByComparingTo("10.000");
            assertThat(currentOrderStatus(fixture.orderId())).isEqualTo(PurchaseOrderStatus.RECEIVED);
            assertThat(receiptCount(fixture.orderId())).isEqualTo(2L);
        } finally {
            releaseFirstCommit.countDown();
            shutDown(executor);
        }
    }

    private Fixture persistSentOrder(BigDecimal orderedQuantity) {
        String fixtureId = UUID.randomUUID().toString();
        Branch branch = branchRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Seed branch is required for receipt tests"));
        Category category = categoryRepository.saveAndFlush(new Category("Receipt concurrency " + fixtureId, null));

        Product product = new Product();
        product.setName("Receipt product " + fixtureId);
        product.setCategory(category);
        product.setBarcode(fixtureId);
        product.setSalePrice(new BigDecimal("20.00"));
        product.setOnlineStatus(ProductOnlineStatus.DRAFT);
        product.setActive(true);
        product = productRepository.saveAndFlush(product);

        Supplier supplier = new Supplier();
        supplier.setName("Receipt supplier " + fixtureId);
        supplier.setActive(true);
        supplier = supplierRepository.saveAndFlush(supplier);

        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setProduct(product);
        item.setQuantityOrdered(orderedQuantity);
        item.setUnitCost(new BigDecimal("10.00"));
        item.setSubtotal(orderedQuantity.multiply(new BigDecimal("10.00")));

        PurchaseOrder order = new PurchaseOrder();
        order.setSupplier(supplier);
        order.setBranch(branch);
        order.setStatus(PurchaseOrderStatus.SENT);
        order.setSentAt(OffsetDateTime.now());
        order.addItem(item);
        order = purchaseOrderRepository.saveAndFlush(order);
        return new Fixture(order.getId(), order.getItems().getFirst().getId());
    }

    private static PurchaseReceiptRequest receiptRequest(Fixture fixture, String quantity, String suffix) {
        return new PurchaseReceiptRequest(
                fixture.orderId(),
                "CONCURRENT-" + suffix,
                null,
                List.of(new PurchaseReceiptItemRequest(
                        fixture.itemId(),
                        new BigDecimal(quantity),
                        new BigDecimal("10.00"),
                        "LOT-" + suffix,
                        LocalDate.now().plusDays(30))));
    }

    private PurchaseOrderStatus currentOrderStatus(Long orderId) {
        entityManager.clear();
        return purchaseOrderRepository.findById(orderId).orElseThrow().getStatus();
    }

    private Long receiptCount(Long orderId) {
        return entityManager
                .createQuery(
                        "select count(receipt) from PurchaseReceipt receipt where receipt.purchaseOrder.id = :orderId",
                        Long.class)
                .setParameter("orderId", orderId)
                .getSingleResult();
    }

    private static Throwable captureFailure(Runnable operation) {
        try {
            operation.run();
            return null;
        } catch (Throwable failure) {
            return failure;
        }
    }

    private static void assertDomainCode(Throwable failure, String expectedCode) {
        assertThat(failure).isInstanceOfSatisfying(DomainException.class, exception -> assertThat(exception.getCode())
                .isEqualTo(expectedCode));
    }

    private static void await(CountDownLatch latch) {
        try {
            if (!latch.await(5, TimeUnit.SECONDS)) {
                throw new AssertionError("Timed out waiting for concurrent receipt confirmation");
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new AssertionError("Interrupted while coordinating receipt confirmations", exception);
        }
    }

    private static void assertStillWaiting(CountDownLatch lockAcquired) throws InterruptedException {
        assertThat(lockAcquired.await(300, TimeUnit.MILLISECONDS)).isFalse();
    }

    private static void shutDown(ExecutorService executor) throws InterruptedException {
        executor.shutdownNow();
        if (!executor.awaitTermination(5, TimeUnit.SECONDS)) {
            throw new AssertionError("Timed out terminating receipt concurrency executor");
        }
    }

    private record Fixture(Long orderId, Long itemId) {}
}
