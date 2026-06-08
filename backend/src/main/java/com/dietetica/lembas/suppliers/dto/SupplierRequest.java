package com.dietetica.lembas.suppliers.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Request used to create or update a supplier. */
public record SupplierRequest(
        @NotBlank @Size(max = 255) String name,
        @Size(max = 255) String contactName,
        @Size(max = 50) String phone,
        @Email @Size(max = 255) String email,
        @Size(max = 20) @Pattern(regexp = "^(\\d{2}-\\d{8}-\\d)?$", message = "CUIT must match format XX-XXXXXXXX-X or be empty") String cuit
) {
}
