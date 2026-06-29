package com.dietetica.lembas.cash.service;

import com.dietetica.lembas.cash.dto.CashEntryDto;
import com.dietetica.lembas.cash.dto.CashSessionDto;
import com.dietetica.lembas.cash.dto.CashTotalsByMethodDto;
import com.dietetica.lembas.cash.model.CashSession;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.users.model.User;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Manual mapper from {@link CashSession} entities to DTOs.
 *
 * <p>Package-private on purpose: only the cash service classes need it. Avoids
 * MapStruct to keep dependencies low and behavior explicit, matching the
 * {@code OrderMapper} convention.</p>
 */
@Component
class CashSessionMapper {

    /** Builds a DTO from a cash session aggregate (open / current endpoints, no entries). */
    CashSessionDto toDto(CashSession session) {
        return toDto(session, null, null);
    }

    /** Builds a DTO including the optional entries list (detail endpoint). */
    CashSessionDto toDto(CashSession session, List<CashEntryDto> entries) {
        return toDto(session, entries, null);
    }

    /**
     * Builds a DTO including the optional entries list and the optional
     * totals-by-method breakdown (S3-US08 close endpoint).
     */
    CashSessionDto toDto(CashSession session, List<CashEntryDto> entries, CashTotalsByMethodDto totalsByMethod) {
        return new CashSessionDto(
                session.getId(),
                session.getStatus(),
                branchId(session.getBranch()),
                branchName(session.getBranch()),
                userId(session.getOpenedByUser()),
                userFullName(session.getOpenedByUser()),
                session.getOpeningCashAmount(),
                session.getOpeningNotes(),
                session.getOpenedAt(),
                session.getExpectedCashAmount(),
                session.getCountedCashAmount(),
                session.getCashDifferenceAmount(),
                session.getCashDifferenceReason(),
                userId(session.getClosedByUser()),
                userFullName(session.getClosedByUser()),
                session.getClosedAt(),
                session.getClosingNotes(),
                session.getCreatedAt(),
                session.getUpdatedAt(),
                entries,
                totalsByMethod
        );
    }

    private static Long branchId(Branch branch) {
        return branch == null ? null : branch.getId();
    }

    private static String branchName(Branch branch) {
        return branch == null ? null : branch.getName();
    }

    private static Long userId(User user) {
        return user == null ? null : user.getId();
    }

    private static String userFullName(User user) {
        if (user == null) {
            return null;
        }
        String first = user.getFirstName() == null ? "" : user.getFirstName();
        String last = user.getLastName() == null ? "" : user.getLastName();
        return (first + " " + last).trim();
    }
}
