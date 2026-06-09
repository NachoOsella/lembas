package com.dietetica.lembas.suppliers.web;

import com.dietetica.lembas.shared.dto.PageResponse;
import com.dietetica.lembas.suppliers.dto.PriceUpdateBatchDefaultsRequest;
import com.dietetica.lembas.suppliers.dto.PriceUpdateBatchDetailDto;
import com.dietetica.lembas.suppliers.dto.PriceUpdateBatchItemUpdateRequest;
import com.dietetica.lembas.suppliers.dto.PriceUpdateBatchSummaryDto;
import com.dietetica.lembas.suppliers.dto.PriceUpdateManualBatchRequest;
import com.dietetica.lembas.suppliers.model.PriceUpdateBatchStatus;
import com.dietetica.lembas.suppliers.service.PriceUpdateBatchService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;

/** Admin REST controller for reviewed supplier price and catalog update batches. */
@RestController
@RequestMapping("/api/admin/price-update-batches")
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
@SecurityRequirement(name = "bearerAuth")
public class PriceUpdateBatchAdminController {
    private final PriceUpdateBatchService service;

    public PriceUpdateBatchAdminController(PriceUpdateBatchService service) {
        this.service = service;
    }

    /** Lists price update batches with optional supplier and status filters. */
    @GetMapping
    public PageResponse<PriceUpdateBatchSummaryDto> list(
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) PriceUpdateBatchStatus status,
            @PageableDefault(size = 10, sort = "createdAt") Pageable pageable
    ) {
        return PageResponse.from(service.list(supplierId, status, pageable));
    }

    /** Creates a manual price update batch. */
    @PostMapping("/manual")
    @ResponseStatus(HttpStatus.CREATED)
    public PriceUpdateBatchDetailDto createManual(@Valid @RequestBody PriceUpdateManualBatchRequest request) {
        return service.createManual(request);
    }

    /** Imports a CSV or XLSX supplier list and returns a reviewed preview batch. */
    @PostMapping("/import")
    @ResponseStatus(HttpStatus.CREATED)
    public PriceUpdateBatchDetailDto importFile(
            @RequestParam Long supplierId,
            @RequestParam MultipartFile file,
            @RequestParam(required = false) BigDecimal newProductMarginPercentage,
            @RequestParam(required = false) BigDecimal transferPercentage,
            @RequestParam(required = false) BigDecimal roundingMultiple,
            @RequestParam(required = false) Boolean applyCostUpdatesByDefault,
            @RequestParam(required = false) Boolean applySalePriceUpdatesByDefault,
            @RequestParam(required = false) Boolean excludeUnchangedByDefault,
            @RequestParam(required = false) String notes
    ) {
        PriceUpdateBatchDefaultsRequest defaults = new PriceUpdateBatchDefaultsRequest(
                newProductMarginPercentage,
                transferPercentage,
                roundingMultiple,
                applyCostUpdatesByDefault,
                applySalePriceUpdatesByDefault,
                excludeUnchangedByDefault
        );
        return service.importFile(supplierId, defaults, file, notes);
    }

    /** Returns one batch detail with preview rows. */
    @GetMapping("/{id}")
    public PriceUpdateBatchDetailDto get(@PathVariable Long id) {
        return service.get(id);
    }

    /** Updates global defaults and recalculates the preview. */
    @PatchMapping("/{id}/defaults")
    public PriceUpdateBatchDetailDto updateDefaults(
            @PathVariable Long id,
            @Valid @RequestBody PriceUpdateBatchDefaultsRequest request
    ) {
        return service.updateDefaults(id, request);
    }

    /** Updates a single preview row with admin overrides. */
    @PatchMapping("/{id}/items/{itemId}")
    public PriceUpdateBatchDetailDto updateItem(
            @PathVariable Long id,
            @PathVariable Long itemId,
            @Valid @RequestBody PriceUpdateBatchItemUpdateRequest request
    ) {
        return service.updateItem(id, itemId, request);
    }

    /** Applies current global defaults to all preview rows. */
    @PatchMapping("/{id}/apply-defaults-to-all")
    public PriceUpdateBatchDetailDto applyDefaultsToAll(@PathVariable Long id) {
        return service.applyDefaultsToAll(id);
    }

    /** Validates the batch before application. */
    @PatchMapping("/{id}/validate")
    public PriceUpdateBatchDetailDto validate(@PathVariable Long id) {
        return service.validate(id);
    }

    /** Applies the batch transactionally. */
    @PatchMapping("/{id}/apply")
    public PriceUpdateBatchDetailDto apply(@PathVariable Long id) {
        return service.apply(id);
    }

    /** Cancels a draft or validated batch. */
    @PatchMapping("/{id}/cancel")
    public PriceUpdateBatchDetailDto cancel(@PathVariable Long id) {
        return service.cancel(id);
    }
}
