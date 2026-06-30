--
-- V28__orders_cash_session.sql
--
-- Adds the cash session reference to orders so POS sales can be reconciled
-- with the cash register and reversed on cancellation.
--
-- Subtasks:
--    LEMBAS-54 (S3-US10): Persist the cash session on every POS order so the
--    close / arqueo flow can group APPROVED payments and the future
--    cancellation flow can reverse stock + cash against the same session.
--
-- Design notes:
--    * The column is nullable: only POS orders carry a cash session id;
--      ONLINE orders leave it null (online payment is reconciled via the
--      payment provider, not the in-store register).
--    * No foreign key to cash_sessions: cash sessions are append-only history
--      and must be archiveable without breaking historical orders. The
--      application layer validates the session is OPEN at sale time.
--    * No CHECK constraint tying POS rows to non-null cash_session_id: a POS
--      order created before a session is opened is rejected upstream by
--      PosSaleService, so we keep the schema permissive to ease backfills.
--

ALTER TABLE orders
    ADD COLUMN cash_session_id BIGINT;

CREATE INDEX idx_orders_cash_session_id ON orders(cash_session_id);

COMMENT ON COLUMN orders.cash_session_id IS
    'Cash session (Sprint 3) the POS order was billed against. NULL for ONLINE orders.';
