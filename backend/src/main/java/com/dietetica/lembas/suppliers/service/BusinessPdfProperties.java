package com.dietetica.lembas.suppliers.service;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Business identity shown in generated purchase order PDFs. */
@ConfigurationProperties(prefix = "app.business")
public record BusinessPdfProperties(
        String name,
        String address,
        String phone,
        String email,
        String cuit
) {
    /** Returns a safe display name when configuration is incomplete. */
    public String displayName() {
        return name == null || name.isBlank() ? "Dietetica Lembas" : name;
    }
}
