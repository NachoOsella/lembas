package com.dietetica.lembas.suppliers.web;

import com.dietetica.lembas.shared.dto.PageResponse;
import com.dietetica.lembas.suppliers.dto.SupplierDto;
import com.dietetica.lembas.suppliers.dto.SupplierRequest;
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

/** Admin REST controller for supplier CRUD operations. */
@RestController
@RequestMapping("/api/admin/suppliers")
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
@SecurityRequirement(name = "bearerAuth")
public class SupplierAdminController {
    private final SupplierService supplierService;

    public SupplierAdminController(SupplierService supplierService) {
        this.supplierService = supplierService;
    }

    /** Returns active suppliers matching optional search text. */
    @GetMapping
    public PageResponse<SupplierDto> list(
            @RequestParam(required = false) String search,
            @PageableDefault(size = 10, sort = "name") Pageable pageable
    ) {
        return PageResponse.from(supplierService.listSuppliers(search, pageable));
    }

    /** Returns one supplier for edit mode. */
    @GetMapping("/{id}")
    public SupplierDto get(@PathVariable Long id) {
        return supplierService.getSupplier(id);
    }

    /** Creates a supplier. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SupplierDto create(@Valid @RequestBody SupplierRequest request) {
        return supplierService.createSupplier(request);
    }

    /** Updates a supplier. */
    @PutMapping("/{id}")
    public SupplierDto update(@PathVariable Long id, @Valid @RequestBody SupplierRequest request) {
        return supplierService.updateSupplier(id, request);
    }

    /** Soft-deletes a supplier. */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        supplierService.deleteSupplier(id);
    }
}
