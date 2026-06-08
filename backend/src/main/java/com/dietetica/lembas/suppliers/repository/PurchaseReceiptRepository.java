package com.dietetica.lembas.suppliers.repository;

import com.dietetica.lembas.suppliers.model.PurchaseReceipt;
import org.springframework.data.jpa.repository.JpaRepository;

/** Repository for confirmed merchandise receipts. */
public interface PurchaseReceiptRepository extends JpaRepository<PurchaseReceipt, Long> {
}
