package com.dietetica.lembas.payments.service;

/** Available {@link com.dietetica.lembas.payments.gateway.PaymentGateway} implementations. */
public enum GatewayMode {
    /** In-memory gateway used for development and tests. */
    FAKE,
    /** Real Mercado Pago HTTP client. */
    MERCADO_PAGO;

    /**
     * Parses the configured mode value, defaulting to {@link #FAKE} when the
     * property is blank. Throws for any other value so misconfigurations
     * fail fast at startup instead of falling through to a silent default.
     */
    public static GatewayMode from(String value) {
        if (value == null || value.isBlank() || "fake".equalsIgnoreCase(value)) {
            return FAKE;
        }
        if ("mercadopago".equalsIgnoreCase(value)) {
            return MERCADO_PAGO;
        }
        throw new IllegalArgumentException("Unsupported payments.gateway value: " + value);
    }
}
