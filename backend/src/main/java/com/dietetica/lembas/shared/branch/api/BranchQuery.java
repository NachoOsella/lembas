package com.dietetica.lembas.shared.branch.api;

import com.dietetica.lembas.shared.branch.model.Branch;
import java.util.List;
import java.util.Optional;

/** Read access to branches required by other feature modules. */
public interface BranchQuery {

    /** Finds a branch by its identifier. */
    Optional<Branch> findById(Long branchId);

    /** Finds an active branch by its identifier. */
    Optional<Branch> findActiveById(Long branchId);

    /** Returns whether a branch exists with the provided identifier. */
    boolean existsById(Long branchId);

    /** Returns whether an active branch exists with the provided identifier. */
    boolean existsActive(Long branchId);

    /** Lists active branches ordered by name. */
    List<Branch> listActive();
}
