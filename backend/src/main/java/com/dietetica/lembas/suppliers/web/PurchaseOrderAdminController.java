package com.dietetica.lembas.suppliers.web;

import com.dietetica.lembas.shared.dto.PageResponse;
import com.dietetica.lembas.suppliers.dto.PurchaseOrderCancelRequest;
import com.dietetica.lembas.suppliers.dto.PurchaseOrderDetailDto;
import com.dietetica.lembas.suppliers.dto.PurchaseOrderRequest;
import com.dietetica.lembas.suppliers.dto.PurchaseOrderSummaryDto;
import com.dietetica.lembas.suppliers.model.PurchaseOrder;
import com.dietetica.lembas.suppliers.model.PurchaseOrderStatus;
import com.dietetica.lembas.suppliers.service.PurchaseOrderPdfService;
import com.dietetica.lembas.suppliers.service.PurchaseOrderService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Admin REST controller for supplier purchase orders and PDF download. */
@RestController
@RequestMapping("/api/admin/purchase-orders")
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
@SecurityRequirement(name = "bearerAuth")
public class PurchaseOrderAdminController {
    private final PurchaseOrderService purchaseOrderService;
    private final PurchaseOrderPdfService purchaseOrderPdfService;

    public PurchaseOrderAdminController(PurchaseOrderService purchaseOrderService, PurchaseOrderPdfService purchaseOrderPdfService) {
        this.purchaseOrderService = purchaseOrderService;
        this.purchaseOrderPdfService = purchaseOrderPdfService;
    }

    /** Returns purchase orders matching optional filters. */
    @GetMapping
    public PageResponse<PurchaseOrderSummaryDto> list(
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) PurchaseOrderStatus status,
            @PageableDefault(size = 10, sort = "createdAt") Pageable pageable
    ) {
        return PageResponse.from(purchaseOrderService.list(supplierId, branchId, status, pageable));
    }

    /** Returns one purchase order with items. */
    @GetMapping("/{id}")
    public PurchaseOrderDetailDto get(@PathVariable Long id) {
        return purchaseOrderService.get(id);
    }

    /** Creates a draft purchase order. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PurchaseOrderDetailDto create(@Valid @RequestBody PurchaseOrderRequest request) {
        return purchaseOrderService.create(request);
    }

    /** Updates a draft purchase order. */
    @PutMapping("/{id}")
    public PurchaseOrderDetailDto update(@PathVariable Long id, @Valid @RequestBody PurchaseOrderRequest request) {
        return purchaseOrderService.update(id, request);
    }

    /** Confirms a draft purchase order. */
    @PatchMapping("/{id}/confirm")
    public PurchaseOrderDetailDto confirm(@PathVariable Long id) {
        return purchaseOrderService.confirm(id);
    }

    /** Marks a confirmed purchase order as sent manually. */
    @PatchMapping("/{id}/send")
    public PurchaseOrderDetailDto send(@PathVariable Long id) {
        return purchaseOrderService.send(id);
    }

    /** Cancels a purchase order before reception. */
    @PatchMapping("/{id}/cancel")
    public PurchaseOrderDetailDto cancel(@PathVariable Long id, @Valid @RequestBody PurchaseOrderCancelRequest request) {
        return purchaseOrderService.cancel(id, request.reason());
    }

    /** Generates the purchase order PDF on demand for manual sending. */
    @GetMapping(value = "/{id}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> downloadPdf(@PathVariable Long id) {
        PurchaseOrder order = purchaseOrderService.getForPdf(id);
        byte[] pdf = purchaseOrderPdfService.generate(order);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename("purchase-order-" + id + ".pdf")
                .build());
        return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
    }
}
