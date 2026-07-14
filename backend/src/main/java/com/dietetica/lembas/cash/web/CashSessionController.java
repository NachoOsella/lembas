package com.dietetica.lembas.cash.web;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.cash.dto.CashCloseRequest;
import com.dietetica.lembas.cash.dto.CashMovementDto;
import com.dietetica.lembas.cash.dto.CashSessionDto;
import com.dietetica.lembas.cash.dto.CreateCashMovementRequest;
import com.dietetica.lembas.cash.dto.OpenCashSessionRequest;
import com.dietetica.lembas.cash.service.CashService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST endpoints used by internal users (ADMIN, MANAGER, EMPLOYEE) to manage
 * cash register sessions.
 *
 * <p>Open/current/detail/movements endpoints come from S3-US06 and S3-US07;
 * the close endpoint is added by S3-US08.</p>
 */
@RestController
@RequestMapping("/api/admin/cash-sessions")
@PreAuthorize("hasAnyRole('ADMIN','MANAGER','EMPLOYEE')")
public class CashSessionController {

    private final CashService cashService;
    private final SecurityContextHelper securityContextHelper;

    public CashSessionController(
            CashService cashService,
            SecurityContextHelper securityContextHelper
    ) {
        this.cashService = cashService;
        this.securityContextHelper = securityContextHelper;
    }

    /**
     * Opens a new cash session for the resolved branch.
     *
     * <p>{@code branchId} is only honoured for ADMIN; for MANAGER/EMPLOYEE the
     * branch is derived from the authenticated user.</p>
     */
    @PostMapping("/open")
    @ResponseStatus(HttpStatus.CREATED)
    public CashSessionDto open(@Valid @RequestBody OpenCashSessionRequest request) {
        return cashService.openCashSession(request, securityContextHelper.getCurrentUser());
    }

    /**
     * Returns the OPEN session for the resolved branch.
     *
     * @param branchId required for ADMIN; ignored for MANAGER/EMPLOYEE
     */
    @GetMapping("/current")
    public CashSessionDto current(@RequestParam(required = false) Long branchId) {
        return cashService.getCurrentSession(branchId, securityContextHelper.getCurrentUser());
    }

    /** Returns a single cash session by id including its manual movements. */
    @GetMapping("/{id}")
    public CashSessionDto getById(@PathVariable Long id) {
        return cashService.getSessionById(id);
    }

    /** Registers a manual cash movement in an OPEN cash session. */
    @PostMapping("/{id}/movements")
    @ResponseStatus(HttpStatus.CREATED)
    public CashMovementDto addMovement(
            @PathVariable Long id,
            @Valid @RequestBody CreateCashMovementRequest request
    ) {
        return cashService.addMovement(id, request, securityContextHelper.getCurrentUser());
    }

    /**
     * Closes an OPEN cash session with the cash counted by the cashier (S3-US08).
     *
     * <p>Returns the closed session including the expected/counted/difference
     * amounts, the closing user, and the totals-by-method breakdown.</p>
     */
    @PostMapping("/{id}/close")
    public CashSessionDto close(
            @PathVariable Long id,
            @Valid @RequestBody CashCloseRequest request
    ) {
        return cashService.closeCashSession(id, request, securityContextHelper.getCurrentUser());
    }
}