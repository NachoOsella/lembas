package com.dietetica.lembas.inventory.web;

import com.dietetica.lembas.inventory.dto.StockLotResponse;
import com.dietetica.lembas.inventory.service.StockLotService;
import com.dietetica.lembas.shared.dto.PageResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Admin REST controller for inventory stock lot queries. */
@RestController
@RequestMapping("/api/admin/stock/lots")
@PreAuthorize("hasAnyRole('ADMIN','MANAGER','EMPLOYEE')")
@SecurityRequirement(name = "bearerAuth")
public class StockLotAdminController {

    private final StockLotService stockLotService;

    public StockLotAdminController(StockLotService stockLotService) {
        this.stockLotService = stockLotService;
    }

    /** Returns paginated stock lots matching the optional inventory filters. */
    @GetMapping
    public PageResponse<StockLotResponse> listLots(
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) Long branchId,
            @RequestParam(defaultValue = "false") boolean expiringSoon,
            @PageableDefault(size = 10, sort = "expirationDate") Pageable pageable
    ) {
        return PageResponse.from(stockLotService.listLots(productId, branchId, expiringSoon, pageable));
    }
}
