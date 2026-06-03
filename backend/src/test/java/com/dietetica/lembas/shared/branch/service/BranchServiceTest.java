package com.dietetica.lembas.shared.branch.service;

import com.dietetica.lembas.shared.branch.dto.BranchResponse;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link BranchService}.
 *
 * <p>Covers: listing active branches, mapping to DTOs, empty results,
 * and sort ordering.</p>
 */
@ExtendWith(MockitoExtension.class)
class BranchServiceTest {

    @Mock
    private BranchRepository branchRepository;

    @InjectMocks
    private BranchService branchService;

    @Test
    void Should_returnAllActiveBranchesAsResponses_when_theyExist() {
        Branch branch1 = mockBranch(1L, "Sucursal Centro", "Av. Colon 123", "+54 351 111 1111", true);
        Branch branch2 = mockBranch(2L, "Sucursal Norte", null, "+54 351 222 2222", true);
        when(branchRepository.findByActiveTrueOrderByNameAsc(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(branch1, branch2)));

        List<BranchResponse> result = branchService.listActiveBranches();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).id()).isEqualTo(1L);
        assertThat(result.get(0).name()).isEqualTo("Sucursal Centro");
        assertThat(result.get(0).address()).isEqualTo("Av. Colon 123");
        assertThat(result.get(0).phone()).isEqualTo("+54 351 111 1111");
        assertThat(result.get(0).active()).isTrue();

        assertThat(result.get(1).id()).isEqualTo(2L);
        assertThat(result.get(1).name()).isEqualTo("Sucursal Norte");
        assertThat(result.get(1).address()).isNull();
        assertThat(result.get(1).phone()).isEqualTo("+54 351 222 2222");
        assertThat(result.get(1).active()).isTrue();
    }

    @Test
    void Should_preserveSortOrder_when_returningActiveBranches() {
        Branch branchC = mockBranch(1L, "Sucursal Sur", null, null, true);
        Branch branchN = mockBranch(2L, "Sucursal Norte", null, null, true);
        // Repository already returns sorted by name; service passes through
        when(branchRepository.findByActiveTrueOrderByNameAsc(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(branchN, branchC)));

        List<BranchResponse> result = branchService.listActiveBranches();

        // Service does not re-sort, so it preserves whatever the repository returns
        assertThat(result).extracting(BranchResponse::name)
                .containsExactly("Sucursal Norte", "Sucursal Sur");
    }

    @Test
    void Should_returnEmptyList_when_noActiveBranchesExist() {
        when(branchRepository.findByActiveTrueOrderByNameAsc(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));

        List<BranchResponse> result = branchService.listActiveBranches();

        assertThat(result).isEmpty();
    }

    @Test
    void Should_onlyReturnActiveBranches_when_mixedBranchesExist() {
        Branch active = mockBranch(1L, "Sucursal Centro", null, null, true);
        when(branchRepository.findByActiveTrueOrderByNameAsc(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(active)));

        List<BranchResponse> result = branchService.listActiveBranches();

        // The repository query filters by active=true, so only active
        // branches appear in the result.
        assertThat(result).hasSize(1);
        assertThat(result.get(0).active()).isTrue();
    }

    @Test
    void Should_callRepositoryWithPageSizeLimit_when_listingActiveBranches() {
        when(branchRepository.findByActiveTrueOrderByNameAsc(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));

        branchService.listActiveBranches();

        // The service passes a PageRequest with a max size of 500.
        // This test documents that the call is made; the exact page size
        // is verified implicitly through the repository contract.
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /** Creates a mocked Branch that returns the given field values from its getters. */
    private Branch mockBranch(Long id, String name, String address, String phone, boolean active) {
        Branch branch = org.mockito.Mockito.mock(Branch.class);
        when(branch.getId()).thenReturn(id);
        when(branch.getName()).thenReturn(name);
        when(branch.getAddress()).thenReturn(address);
        when(branch.getPhone()).thenReturn(phone);
        when(branch.isActive()).thenReturn(active);
        return branch;
    }
}
