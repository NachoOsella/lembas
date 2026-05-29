package com.dietetica.lembas.catalog.web;

import com.dietetica.lembas.catalog.dto.ProductDetailDto;
import com.dietetica.lembas.catalog.dto.ProductSummaryDto;
import com.dietetica.lembas.catalog.service.ProductService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Public REST controller for online-store product browsing. */
@RestController
@RequestMapping("/api/store/products")
public class ProductStoreController {

    private final ProductService productService;

    public ProductStoreController(ProductService productService) {
        this.productService = productService;
    }

    /** Returns products published in the public online store. */
    @GetMapping
    public Page<ProductSummaryDto> list(
            @RequestParam(name = "q", required = false) String search,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long branchId,
            @PageableDefault(size = 20, sort = "name") Pageable pageable
    ) {
        return productService.listStoreProducts(search, categoryId, pageable);
    }

    /** Returns a published product detail for the public online store. */
    @GetMapping("/{id}")
    public ProductDetailDto detail(
            @PathVariable Long id,
            @RequestParam(required = false) Long branchId
    ) {
        return productService.getStoreProductDetail(id);
    }

    /** Returns 15 random published products for the home page featured section. */
    @GetMapping("/featured")
    public Page<ProductSummaryDto> featured() {
        return productService.listRandomPublishedProducts();
    }
}
