package com.dietetica.lembas.shared.branch.web;

import com.dietetica.lembas.shared.branch.dto.BranchResponse;
import com.dietetica.lembas.shared.branch.service.BranchService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller that exposes active branches for admin selector fields.
 */
@RestController
@RequestMapping("/api/admin/branches")
public class BranchAdminController {

    private final BranchService branchService;

    public BranchAdminController(BranchService branchService) {
        this.branchService = branchService;
    }

    /**
     * Returns active branches assignable to managers and employees.
     *
     * @return active branches sorted by name
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<BranchResponse> listBranches() {
        return branchService.listActiveBranches();
    }
}
