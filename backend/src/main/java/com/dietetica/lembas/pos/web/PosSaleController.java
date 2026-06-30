package com.dietetica.lembas.pos.web;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.orders.dto.OrderDetailDto;
import com.dietetica.lembas.pos.dto.CreatePosSaleRequest;
import com.dietetica.lembas.pos.service.PosSaleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST endpoints for in-store (POS) sales.
 *
 * <p>Exposed under {@code /api/pos/sales} and protected by the standard
 * internal-role rule in {@code SecurityConfig}
 * ({@code hasAnyRole("ADMIN", "MANAGER", "EMPLOYEE")}).</p>
 */
@RestController
@RequestMapping("/api/pos/sales")
public class PosSaleController {

    private final PosSaleService posSaleService;
    private final SecurityContextHelper securityContextHelper;

    public PosSaleController(
            PosSaleService posSaleService,
            SecurityContextHelper securityContextHelper
    ) {
        this.posSaleService = posSaleService;
        this.securityContextHelper = securityContextHelper;
    }

    /**
     * Registers an in-store sale: order (POS, PAID), payment (MANUAL,
     * APPROVED), and stock movements (POS_SALE) in a single transaction.
     *
     * <p>Errors:</p>
     * <ul>
     *   <li>{@code CASH_BRANCH_REQUIRED} (400) when the cashier has no branch.</li>
     *   <li>{@code CASH_SESSION_NOT_FOUND} (404) when no OPEN session exists for the cashier's branch.</li>
     *   <li>{@code BRANCH_NOT_FOUND} (404) when the resolved branch is missing or inactive.</li>
     *   <li>{@code PRODUCT_NOT_FOUND} (404) for any inactive or missing product.</li>
     *   <li>{@code INSUFFICIENT_STOCK} (409) when FEFO cannot cover the requested quantity.</li>
     *   <li>{@code VALIDATION_ERROR} (400) for malformed request bodies.</li>
     * </ul>
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderDetailDto create(@Valid @RequestBody CreatePosSaleRequest request) {
        return posSaleService.createSale(request, securityContextHelper.getCurrentUser());
    }
}
