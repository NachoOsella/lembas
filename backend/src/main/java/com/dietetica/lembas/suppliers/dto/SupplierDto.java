package com.dietetica.lembas.suppliers.dto;

/** Supplier response used by admin screens. */
public record SupplierDto(
        Long id,
        String name,
        String contactName,
        String phone,
        String email,
        String cuit
) {
}
