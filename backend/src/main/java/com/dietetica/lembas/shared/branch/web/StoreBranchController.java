package com.dietetica.lembas.shared.branch.web;

import com.dietetica.lembas.shared.branch.dto.BranchResponse;
import com.dietetica.lembas.shared.branch.service.BranchService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Public controller that exposes active pickup branches for the online store.
 */
@RestController
@RequestMapping("/api/store/branches")
public class StoreBranchController {

    private final BranchService branchService;

    public StoreBranchController(BranchService branchService) {
        this.branchService = branchService;
    }

    /**
     * Returns active branches where customers can pick up online orders.
     *
     * @return active branches sorted by name
     */
    @GetMapping
    public List<BranchResponse> listBranches() {
        return branchService.listActiveBranches();
    }
}
