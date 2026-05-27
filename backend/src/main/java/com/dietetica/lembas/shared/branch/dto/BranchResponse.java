package com.dietetica.lembas.shared.branch.dto;

/**
 * Response DTO for branch selector data.
 *
 * @param id branch identifier
 * @param name display name
 * @param address optional address
 * @param phone optional phone
 * @param active whether the branch is active
 */
public record BranchResponse(Long id, String name, String address, String phone, boolean active) {
}
