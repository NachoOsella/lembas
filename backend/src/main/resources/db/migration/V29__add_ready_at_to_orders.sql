--
-- V29__add_ready_at_to_orders.sql
--
-- Adds ready_at timestamp to orders for the READY lifecycle state (S4-US01).
--
-- Context: S4-US01 adds the PREPARING -> READY -> DELIVERED flow for ONLINE
-- orders. The paid_at, prepared_at, and delivered_at columns already exist.
-- ready_at completes the set so every non-terminal state has a dedicated
-- timestamp for the admin order timeline.
--

ALTER TABLE orders
    ADD COLUMN ready_at TIMESTAMPTZ;

COMMENT ON COLUMN orders.ready_at IS
    'Timestamp when the order was marked READY (ready for pickup at the branch).';
