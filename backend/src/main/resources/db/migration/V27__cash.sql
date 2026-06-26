--
-- V27__cash.sql
--
-- Cash register sessions and manual movements (Sprint 3, S3-US06 LEMBAS-50).
--
-- Subtasks:
--    LEMBAS-276: Crear V__cash.sql con cash_sessions y cash_movements
--
-- Note: docs/03-architecture/database-design.md references "V7__cash.sql" by
-- name, but the project had already advanced to V26__payments.sql. This new
-- incremental migration (V27) keeps the Flyway linear history consistent for
-- fresh and existing databases, mirroring how V25__orders.sql bumped the
-- documented V5__orders.sql to V25.
--
-- This story only implements the OPEN use case; cash_movements is created now
-- so a second migration is not needed later when movements/close are added.
-- V26__payments.sql intentionally kept cash_session_id as a scalar reference
-- "until the cash module creates cash_sessions"; V27 closes that debt by
-- adding the foreign key.
-- =============================================================================

-- =============================================================================
-- cash_sessions: one shift per branch, OPEN -> CLOSED.
-- =============================================================================
CREATE TABLE cash_sessions (
    id                       BIGSERIAL       PRIMARY KEY,
    branch_id                BIGINT          NOT NULL REFERENCES branches(id),
    opened_by_user_id        BIGINT          NOT NULL REFERENCES users(id),
    closed_by_user_id        BIGINT          REFERENCES users(id),
    opened_at                TIMESTAMPTZ     DEFAULT now() NOT NULL,
    closed_at                TIMESTAMPTZ,
    opening_cash_amount      DECIMAL(12, 2)  NOT NULL CHECK (opening_cash_amount >= 0),
    expected_cash_amount     DECIMAL(12, 2),
    counted_cash_amount      DECIMAL(12, 2),
    cash_difference_amount   DECIMAL(12, 2),
    cash_difference_reason   TEXT,
    status                   VARCHAR(10)     NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    opening_notes            TEXT,
    closing_notes            TEXT,
    created_at               TIMESTAMPTZ     DEFAULT now() NOT NULL,
    updated_at               TIMESTAMPTZ     DEFAULT now() NOT NULL,

    CONSTRAINT chk_cash_sessions_closed_by_only_when_closed
        CHECK ((status = 'CLOSED') = (closed_at IS NOT NULL))
);

COMMENT ON TABLE cash_sessions IS 'Cash register sessions per branch: OPEN while in use, CLOSED at close.';

CREATE INDEX idx_cash_sessions_branch_id ON cash_sessions(branch_id);
CREATE INDEX idx_cash_sessions_branch_status ON cash_sessions(branch_id, status);
CREATE INDEX idx_cash_sessions_opened_by_user_id ON cash_sessions(opened_by_user_id);

-- Only one OPEN session per branch at a time. The partial unique index is the
-- concurrency guard for the rule "a branch cannot have two open sessions"; the
-- service repeats the check but the index guarantees correctness under races.
CREATE UNIQUE INDEX uk_cash_sessions_one_open_per_branch
    ON cash_sessions(branch_id)
    WHERE status = 'OPEN';

-- =============================================================================
-- cash_movements: manual movements during an OPEN session.
-- =============================================================================
CREATE TABLE cash_movements (
    id                       BIGSERIAL       PRIMARY KEY,
    cash_session_id          BIGINT          NOT NULL REFERENCES cash_sessions(id),
    created_by_user_id       BIGINT          NOT NULL REFERENCES users(id),
    type                     VARCHAR(20)     NOT NULL CHECK (type IN ('CASH_IN', 'CASH_OUT', 'ADJUSTMENT')),
    method                   VARCHAR(20)     NOT NULL CHECK (method IN ('CASH', 'TRANSFER', 'OTHER')),
    amount                   DECIMAL(12, 2)  NOT NULL CHECK (amount <> 0),
    reason                   TEXT            NOT NULL,
    created_at               TIMESTAMPTZ     DEFAULT now() NOT NULL
);

COMMENT ON TABLE cash_movements IS 'Manual cash movements registered during a cash session.';

CREATE INDEX idx_cash_movements_cash_session_id ON cash_movements(cash_session_id);
CREATE INDEX idx_cash_movements_created_by_user_id ON cash_movements(created_by_user_id);

-- =============================================================================
-- Close the debt left by V26__payments.sql: add the FK from payments to
-- cash_sessions now that the referenced table exists.
-- =============================================================================
ALTER TABLE payments
    ADD CONSTRAINT fk_payments_cash_session
        FOREIGN KEY (cash_session_id) REFERENCES cash_sessions(id);