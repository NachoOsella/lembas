package com.dietetica.lembas.suppliers.web;

import com.dietetica.lembas.shared.dto.PageResponse;
import com.dietetica.lembas.suppliers.dto.SupplierProductCostHistoryDto;
import com.dietetica.lembas.suppliers.dto.SupplierProductDto;
import com.dietetica.lembas.suppliers.dto.SupplierProductRequest;
import com.dietetica.lembas.suppliers.service.SupplierService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Admin REST controller for supplier-product replacement costs. */
@RestController
@RequestMapping("/api/admin/supplier-products")
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
@SecurityRequirement(name = "bearerAuth")
public class SupplierProductAdminController {
    private final SupplierService supplierService;

    public SupplierProductAdminController(SupplierService supplierService) {
        this.supplierService = supplierService;
    }

    /** Returns active supplier-product associations. */
    @GetMapping
    public PageResponse<SupplierProductDto> list(
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 10, sort = "productName") Pageable pageable
    ) {
        return PageResponse.from(supplierService.listSupplierProducts(productId, supplierId, search, pageable));
    }

    /** Returns one supplier-product association for edit mode. */
    @GetMapping("/{id}")
    public SupplierProductDto get(@PathVariable Long id) {
        return supplierService.getSupplierProduct(id);
    }

    /** Creates a supplier-product association and initial cost history row. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SupplierProductDto create(@Valid @RequestBody SupplierProductRequest request) {
        return supplierService.createSupplierProduct(request);
    }

    /** Updates supplier-product association and records cost history when cost changes. */
    @PutMapping("/{id}")
    public SupplierProductDto update(@PathVariable Long id, @Valid @RequestBody SupplierProductRequest request) {
        return supplierService.updateSupplierProduct(id, request);
    }

    /** Soft-deletes a supplier-product association. */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        supplierService.deleteSupplierProduct(id);
    }

    /** Returns replacement cost history for one supplier-product association. */
    @GetMapping("/{id}/cost-history")
    public PageResponse<SupplierProductCostHistoryDto> costHistory(
            @PathVariable Long id,
            @PageableDefault(size = 10) Pageable pageable
    ) {
        return PageResponse.from(supplierService.listCostHistory(id, pageable));
    }
}
