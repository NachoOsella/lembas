package com.dietetica.lembas.inventory.web;

import com.dietetica.lembas.suppliers.dto.PurchaseReceiptDto;
import com.dietetica.lembas.suppliers.dto.PurchaseReceiptRequest;
import com.dietetica.lembas.suppliers.service.PurchaseReceiptService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Admin REST controller for merchandise receipts that generate stock. */
@RestController
@RequestMapping("/api/admin/stock/receipts")
@PreAuthorize("hasAnyRole('ADMIN','MANAGER','EMPLOYEE')")
@SecurityRequirement(name = "bearerAuth")
public class StockReceiptAdminController {
    private final PurchaseReceiptService purchaseReceiptService;

    public StockReceiptAdminController(PurchaseReceiptService purchaseReceiptService) {
        this.purchaseReceiptService = purchaseReceiptService;
    }

    /** Confirms a purchase receipt and creates its stock lots and PURCHASE_ENTRY movements. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PurchaseReceiptDto confirm(@Valid @RequestBody PurchaseReceiptRequest request) {
        return purchaseReceiptService.confirm(request);
    }
}
