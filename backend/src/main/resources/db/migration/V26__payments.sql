-- Unified payments base for ONLINE and POS orders.
-- cash_session_id is kept as a scalar reference until the cash module creates cash_sessions.

CREATE TABLE payments (
    id                     BIGSERIAL PRIMARY KEY,
    order_id               BIGINT          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    cash_session_id        BIGINT,
    provider               VARCHAR(50)     NOT NULL,
    method                 VARCHAR(50)     NOT NULL,
    status                 VARCHAR(20)     NOT NULL,
    amount                 DECIMAL(12, 2)  NOT NULL,
    currency               VARCHAR(3)      NOT NULL DEFAULT 'ARS',
    provider_payment_id    VARCHAR(255),
    provider_preference_id VARCHAR(255),
    external_reference     VARCHAR(255),
    approved_at            TIMESTAMPTZ,
    metadata               JSONB,
    created_at             TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT chk_payments_provider
        CHECK (provider IN ('MERCADO_PAGO', 'MANUAL', 'BANK', 'CARD_TERMINAL')),
    CONSTRAINT chk_payments_method
        CHECK (method IN ('CHECKOUT_PRO', 'CASH', 'QR', 'TRANSFER', 'DEBIT_CARD', 'CREDIT_CARD', 'OTHER')),
    CONSTRAINT chk_payments_status
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REFUNDED', 'EXPIRED', 'IN_PROCESS')),
    CONSTRAINT chk_payments_amount_positive
        CHECK (amount > 0),
    CONSTRAINT chk_payments_currency_format
        CHECK (currency = upper(currency) AND length(currency) = 3),
    CONSTRAINT chk_payments_mercado_pago_checkout_pro
        CHECK (
            (provider = 'MERCADO_PAGO' AND method = 'CHECKOUT_PRO' AND cash_session_id IS NULL)
            OR provider <> 'MERCADO_PAGO'
        ),
    CONSTRAINT chk_payments_manual_not_checkout_pro
        CHECK (provider <> 'MANUAL' OR method <> 'CHECKOUT_PRO'),
    CONSTRAINT chk_payments_manual_requires_cash_session
        CHECK (provider <> 'MANUAL' OR cash_session_id IS NOT NULL)
);

CREATE UNIQUE INDEX uk_payments_provider_payment_id
    ON payments(provider_payment_id)
    WHERE provider_payment_id IS NOT NULL;

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_cash_session_id ON payments(cash_session_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_provider_preference_id ON payments(provider_preference_id);
