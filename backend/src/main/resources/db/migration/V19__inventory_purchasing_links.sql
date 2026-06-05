--
-- V19__inventory_purchasing_links.sql
--
-- Extends the inventory schema for purchase receipts and richer traceability.
-- This migration is incremental because V18__inventory.sql may already be applied.
--

ALTER TABLE stock_lots
    ADD COLUMN initial_quantity DECIMAL(12, 3),
    ADD COLUMN unit_cost DECIMAL(12, 2),
    ADD COLUMN supplier_id BIGINT,
    ADD COLUMN supplier_product_id BIGINT,
    ADD COLUMN purchase_receipt_id BIGINT,
    ADD COLUMN purchase_receipt_item_id BIGINT,
    ADD COLUMN status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL;

UPDATE stock_lots
SET initial_quantity = quantity_available,
    unit_cost = COALESCE(cost_price, 0)
WHERE initial_quantity IS NULL
   OR unit_cost IS NULL;

ALTER TABLE stock_lots
    ALTER COLUMN initial_quantity SET NOT NULL,
    ALTER COLUMN unit_cost SET NOT NULL,
    ADD CONSTRAINT chk_stock_lots_initial_quantity CHECK (initial_quantity > 0),
    ADD CONSTRAINT chk_stock_lots_unit_cost CHECK (unit_cost >= 0),
    ADD CONSTRAINT chk_stock_lots_status CHECK (status IN ('ACTIVE', 'DEPLETED', 'CANCELLED'));

ALTER TABLE stock_movements
    ADD COLUMN unit_cost_snapshot DECIMAL(12, 2),
    ADD COLUMN reference_type VARCHAR(50),
    ADD COLUMN reference_id BIGINT,
    ADD COLUMN created_by_user_id BIGINT REFERENCES users(id);

UPDATE stock_movements sm
SET unit_cost_snapshot = sl.unit_cost
FROM stock_lots sl
WHERE sm.stock_lot_id = sl.id
  AND sm.unit_cost_snapshot IS NULL;

COMMENT ON COLUMN stock_lots.initial_quantity IS 'Quantity originally received in the lot.';
COMMENT ON COLUMN stock_lots.unit_cost IS 'Real received unit cost frozen at lot creation time.';
COMMENT ON COLUMN stock_lots.supplier_id IS 'Optional supplier id. Foreign key is added when suppliers table is implemented.';
COMMENT ON COLUMN stock_lots.supplier_product_id IS 'Optional supplier-product id. Foreign key is added when supplier_products table is implemented.';
COMMENT ON COLUMN stock_lots.purchase_receipt_id IS 'Optional purchase receipt id. Foreign key is added when purchase_receipts table is implemented.';
COMMENT ON COLUMN stock_lots.purchase_receipt_item_id IS 'Optional purchase receipt item id. Foreign key is added when purchase_receipt_items table is implemented.';
COMMENT ON COLUMN stock_lots.status IS 'Current lot status used to filter active stock.';
COMMENT ON COLUMN stock_movements.unit_cost_snapshot IS 'Unit cost snapshot at movement time for reports and traceability.';
COMMENT ON COLUMN stock_movements.reference_type IS 'Generic source entity type that caused the movement.';
COMMENT ON COLUMN stock_movements.reference_id IS 'Generic source entity id that caused the movement.';
COMMENT ON COLUMN stock_movements.created_by_user_id IS 'User that registered the movement when available.';

CREATE INDEX idx_stock_lots_status ON stock_lots (status);
CREATE INDEX idx_stock_lots_supplier_id ON stock_lots (supplier_id);
CREATE INDEX idx_stock_lots_purchase_receipt_id ON stock_lots (purchase_receipt_id);
CREATE INDEX idx_stock_lots_active_fefo ON stock_lots (product_id, branch_id, status, expiration_date, id)
    WHERE quantity_available > 0 AND status = 'ACTIVE';
CREATE INDEX idx_stock_movements_reference ON stock_movements (reference_type, reference_id);
CREATE INDEX idx_stock_movements_created_by_user_id ON stock_movements (created_by_user_id);
