package com.dietetica.lembas.shared.branch.service;

import com.dietetica.lembas.shared.branch.dto.BranchResponse;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Application service for read-only branch selector use cases.
 */
@Service
public class BranchService {

    private final BranchRepository branchRepository;

    public BranchService(BranchRepository branchRepository) {
        this.branchRepository = branchRepository;
    }

    /**
     * Lists active branches available for assigning internal users.
     *
     * @return active branch DTOs
     */
    @Transactional(readOnly = true)
    public List<BranchResponse> listActiveBranches() {
        return branchRepository.findByActiveTrueOrderByNameAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    /** Maps a branch entity to an API response. */
    private BranchResponse toResponse(Branch branch) {
        return new BranchResponse(
                branch.getId(),
                branch.getName(),
                branch.getAddress(),
                branch.getPhone(),
                branch.isActive()
        );
    }
}
