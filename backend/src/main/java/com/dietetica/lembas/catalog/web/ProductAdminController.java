package com.dietetica.lembas.catalog.web;

import com.dietetica.lembas.catalog.dto.ProductDetailDto;
import com.dietetica.lembas.catalog.dto.ProductRequest;
import com.dietetica.lembas.catalog.dto.ProductStatusUpdateRequest;
import com.dietetica.lembas.catalog.dto.ProductSummaryDto;
import com.dietetica.lembas.catalog.model.ProductOnlineStatus;
import com.dietetica.lembas.catalog.service.ProductService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
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

/** Admin REST controller for product catalog CRUD operations. */
@RestController
@RequestMapping("/api/admin/products")
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
@SecurityRequirement(name = "bearerAuth")
public class ProductAdminController {

    private final ProductService productService;

    public ProductAdminController(ProductService productService) {
        this.productService = productService;
    }

    /** Returns paginated products matching admin filters. */
    @GetMapping
    public Page<ProductSummaryDto> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) ProductOnlineStatus onlineStatus,
            @PageableDefault(size = 10, sort = "name") Pageable pageable
    ) {
        return productService.listAdminProducts(search, categoryId, onlineStatus, pageable);
    }

    /** Returns one product for the edit form. */
    @GetMapping("/{id}")
    public ProductDetailDto detail(@PathVariable Long id) {
        return productService.getDetail(id);
    }

    /** Creates a product. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductDetailDto create(@Valid @RequestBody ProductRequest request) {
        return productService.create(request);
    }

    /** Replaces editable product data. */
    @PutMapping("/{id}")
    public ProductDetailDto update(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        return productService.update(id, request);
    }

    /** Soft-deletes the product from active admin catalog listings. */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        productService.delete(id);
    }

    /** Changes the product online publishing status. */
    @PatchMapping("/{id}/status")
    public ProductSummaryDto changeStatus(
            @PathVariable Long id,
            @Valid @RequestBody ProductStatusUpdateRequest request
    ) {
        return productService.changeOnlineStatus(id, request.onlineStatus());
    }
}
