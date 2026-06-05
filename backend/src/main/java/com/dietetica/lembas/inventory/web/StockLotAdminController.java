package com.dietetica.lembas.inventory.web;

import com.dietetica.lembas.inventory.dto.CreateStockLotRequest;
import com.dietetica.lembas.inventory.dto.StockLotDto;
import com.dietetica.lembas.inventory.service.InventoryService;
import com.dietetica.lembas.shared.dto.PageResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Admin REST controller for inventory stock lot queries and entries. */
@RestController
@RequestMapping("/api/admin/stock/lots")
@PreAuthorize("hasAnyRole('ADMIN','MANAGER','EMPLOYEE')")
@SecurityRequirement(name = "bearerAuth")
public class StockLotAdminController {

    private final InventoryService inventoryService;

    public StockLotAdminController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    /** Returns paginated stock lots matching the optional inventory filters. */
    @GetMapping
    public PageResponse<StockLotDto> listLots(
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(defaultValue = "false") boolean expiringSoon,
            @PageableDefault(size = 10, sort = "expirationDate") Pageable pageable
    ) {
        return PageResponse.from(inventoryService.listLots(productId, branchId, expiringSoon, pageable));
    }

    /** Registers a new stock lot and its PURCHASE_ENTRY movement. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StockLotDto create(@Valid @RequestBody CreateStockLotRequest request) {
        return inventoryService.createStockLot(request);
    }
}
