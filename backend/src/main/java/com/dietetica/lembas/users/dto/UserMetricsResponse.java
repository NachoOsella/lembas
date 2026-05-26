package com.dietetica.lembas.users.dto;

/**
 * Aggregate metrics for the internal users directory.
 *
 * @param totalUsers     total number of internal users (ADMIN, MANAGER, EMPLOYEE)
 * @param enabledUsers   number of enabled internal users
 * @param usersWithBranch number of internal users assigned to a branch
 */
public record UserMetricsResponse(
        long totalUsers,
        long enabledUsers,
        long usersWithBranch
) {
}
