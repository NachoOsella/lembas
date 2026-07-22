package com.dietetica.lembas.inventory.api;

/** Records the inventory effects of one confirmed purchase receipt item. */
public interface PurchaseReceiptEntryCommand {

    /** Creates the receipt's stock lot and its {@code PURCHASE_ENTRY} movement atomically. */
    Long createPurchaseReceiptEntry(PurchaseReceiptEntryRequest request);
}
