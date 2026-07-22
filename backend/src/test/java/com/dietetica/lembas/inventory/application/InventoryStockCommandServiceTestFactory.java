package com.dietetica.lembas.inventory.application;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.catalog.api.ProductLookup;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.inventory.repository.StockMovementRepository;
import com.dietetica.lembas.inventory.service.FefoStockDeductionPolicy;
import com.dietetica.lembas.orders.api.OrderQuery;
import com.dietetica.lembas.shared.branch.api.BranchQuery;
import java.util.Optional;

/** Creates the stock command boundary and its focused services without Spring wiring. */
final class InventoryStockCommandServiceTestFactory {

    private InventoryStockCommandServiceTestFactory() {}

    static InventoryStockCommandService create(
            StockLotRepository stockLotRepository,
            StockMovementRepository stockMovementRepository,
            ProductRepository productRepository,
            BranchQuery branchQuery,
            OrderQuery orderQuery,
            FefoStockDeductionPolicy fefoPolicy,
            SecurityContextHelper securityContextHelper) {
        ProductLookup productLookup = productLookup(productRepository);
        return new InventoryStockCommandService(
                new StockLotCommandService(
                        stockLotRepository, stockMovementRepository, productLookup, branchQuery, securityContextHelper),
                new StockDeductionService(
                        stockLotRepository,
                        stockMovementRepository,
                        productLookup,
                        branchQuery,
                        orderQuery,
                        securityContextHelper,
                        fefoPolicy),
                new StockAdjustmentService(
                        stockLotRepository,
                        stockMovementRepository,
                        productLookup,
                        branchQuery,
                        securityContextHelper,
                        fefoPolicy),
                new StockReversalService(stockLotRepository, stockMovementRepository));
    }

    private static ProductLookup productLookup(ProductRepository productRepository) {
        return new ProductLookup() {
            @Override
            public Optional<Product> findById(Long productId) {
                return productRepository.findById(productId);
            }

            @Override
            public Optional<Product> findActiveById(Long productId) {
                return productRepository.findByIdAndActiveTrue(productId);
            }

            @Override
            public Optional<Product> findPublishedById(Long productId) {
                throw new UnsupportedOperationException("Not used by inventory tests");
            }

            @Override
            public Optional<Product> findActiveByBarcode(String barcode) {
                throw new UnsupportedOperationException("Not used by inventory tests");
            }
        };
    }
}
