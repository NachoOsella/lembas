package com.dietetica.lembas.catalog.api;

import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.users.model.User;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Catalog operations required to review and apply supplier price-update batches.
 *
 * <p>Returned products remain managed within the caller transaction so the supplier module can
 * retain its existing product associations without accessing catalog persistence directly.</p>
 */
public interface SupplierPricingCatalog {

    /** Finds an active product by barcode while matching a supplier price row. */
    Optional<Product> findActiveProductByBarcode(String barcode);

    /** Finds active products whose name exactly matches a supplier price row. */
    List<Product> findActiveProductsByExactName(String name);

    /** Finds an active product selected while resolving a supplier price row. */
    Optional<Product> findActiveProductById(Long productId);

    /** Creates the draft catalog product required for an approved supplier price row. */
    Product createDraftProductForSupplierPriceBatch(String name, String barcode, BigDecimal salePrice);

    /** Changes a product sale price and records its supplier-batch audit history. */
    void changeSalePriceForSupplierPriceBatch(Product product, BigDecimal salePrice, Long batchId, User appliedBy);

    /** Records the initial sale price assigned when a supplier batch creates a product. */
    void recordInitialSalePriceForSupplierPriceBatch(
            Product product, BigDecimal salePrice, Long batchId, User appliedBy);
}
