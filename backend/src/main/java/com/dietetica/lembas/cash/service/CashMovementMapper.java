package com.dietetica.lembas.cash.service;

import com.dietetica.lembas.cash.dto.CashMovementDto;
import com.dietetica.lembas.cash.model.CashMovement;
import com.dietetica.lembas.users.model.User;
import org.springframework.stereotype.Component;

/**
 * Manual mapper from {@link CashMovement} entities to DTOs.
 */
@Component
class CashMovementMapper {

    /** Builds a DTO from a cash movement entity. */
    CashMovementDto toDto(CashMovement movement) {
        return new CashMovementDto(
                movement.getId(),
                movement.getCashSession().getId(),
                movement.getType(),
                movement.getMethod(),
                movement.getAmount(),
                movement.getReason(),
                userId(movement.getCreatedByUser()),
                userFullName(movement.getCreatedByUser()),
                movement.getCreatedAt()
        );
    }

    private static Long userId(User user) {
        return user == null ? null : user.getId();
    }

    private static String userFullName(User user) {
        if (user == null) return null;
        String first = user.getFirstName() == null ? "" : user.getFirstName();
        String last = user.getLastName() == null ? "" : user.getLastName();
        return (first + " " + last).trim();
    }
}