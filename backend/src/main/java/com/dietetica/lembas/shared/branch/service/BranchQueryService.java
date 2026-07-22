package com.dietetica.lembas.shared.branch.service;

import com.dietetica.lembas.shared.branch.api.BranchQuery;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Branch-owned implementation of the cross-module branch query contract. */
@Service
@Transactional(readOnly = true)
public class BranchQueryService implements BranchQuery {

    private final BranchRepository branchRepository;

    public BranchQueryService(BranchRepository branchRepository) {
        this.branchRepository = branchRepository;
    }

    @Override
    public Optional<Branch> findById(Long branchId) {
        return branchRepository.findById(branchId);
    }

    @Override
    public Optional<Branch> findActiveById(Long branchId) {
        return branchRepository.findById(branchId).filter(Branch::isActive);
    }

    @Override
    public boolean existsById(Long branchId) {
        return branchRepository.existsById(branchId);
    }

    @Override
    public boolean existsActive(Long branchId) {
        return branchRepository.existsByIdAndActiveTrue(branchId);
    }

    @Override
    public List<Branch> listActive() {
        return branchRepository.findByActiveTrueOrderByNameAsc();
    }
}
