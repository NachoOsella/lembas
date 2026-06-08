--
-- V23__purchase_receipts.sql
--
-- Purchase receipts represent real merchandise arrival. Confirmed receipts create stock lots
-- and PURCHASE_ENTRY stock movements; purchase orders remain stock-neutral.
--

CREATE TABLE purchase_receipts (
    id BIGSERIAL PRIMARY KEY,
    purchase_order_id BIGINT REFERENCES purchase_orders(id),
    supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
    branch_id BIGINT NOT NULL REFERENCES branches(id),
    status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED',
    invoice_number VARCHAR(100),
    received_at TIMESTAMPTZ,
    received_by_user_id BIGINT REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    confirmed_at TIMESTAMPTZ,

    CONSTRAINT chk_purchase_receipts_status CHECK (status IN ('DRAFT', 'CONFIRMED', 'CANCELLED'))
);

CREATE TABLE purchase_receipt_items (
    id BIGSERIAL PRIMARY KEY,
    purchase_receipt_id BIGINT NOT NULL REFERENCES purchase_receipts(id) ON DELETE CASCADE,
    purchase_order_item_id BIGINT REFERENCES purchase_order_items(id),
    product_id BIGINT NOT NULL REFERENCES products(id),
    supplier_product_id BIGINT REFERENCES supplier_products(id),
    quantity_received DECIMAL(12, 3) NOT NULL,
    unit_cost DECIMAL(12, 2) NOT NULL,
    expiration_date DATE,
    lot_code VARCHAR(100),
    created_stock_lot_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    CONSTRAINT chk_purchase_receipt_items_quantity CHECK (quantity_received > 0),
    CONSTRAINT chk_purchase_receipt_items_unit_cost CHECK (unit_cost >= 0)
);

CREATE INDEX idx_purchase_receipts_order_id ON purchase_receipts (purchase_order_id);
CREATE INDEX idx_purchase_receipts_supplier_status ON purchase_receipts (supplier_id, status);
CREATE INDEX idx_purchase_receipts_branch_status ON purchase_receipts (branch_id, status);
CREATE INDEX idx_purchase_receipt_items_receipt_id ON purchase_receipt_items (purchase_receipt_id);
CREATE INDEX idx_purchase_receipt_items_order_item_id ON purchase_receipt_items (purchase_order_item_id);
CREATE INDEX idx_purchase_receipt_items_product_id ON purchase_receipt_items (product_id);

ALTER TABLE purchase_receipt_items
    ADD CONSTRAINT fk_purchase_receipt_items_stock_lot
    FOREIGN KEY (created_stock_lot_id) REFERENCES stock_lots(id);

ALTER TABLE stock_lots
    ADD CONSTRAINT fk_stock_lots_purchase_receipt
    FOREIGN KEY (purchase_receipt_id) REFERENCES purchase_receipts(id),
    ADD CONSTRAINT fk_stock_lots_purchase_receipt_item
    FOREIGN KEY (purchase_receipt_item_id) REFERENCES purchase_receipt_items(id);

COMMENT ON TABLE purchase_receipts IS 'Real merchandise receptions. Confirmed receipts increase stock.';
COMMENT ON TABLE purchase_receipt_items IS 'Received quantities, real costs, lot codes and expiration dates.';
COMMENT ON COLUMN purchase_receipt_items.created_stock_lot_id IS 'Stock lot created by this confirmed receipt line.';
