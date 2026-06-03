-- Add soft-delete flag and audit timestamps to categories table.
-- Existing categories default to active = true (preserves current visibility).

ALTER TABLE categories
    ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE categories
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE categories
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
