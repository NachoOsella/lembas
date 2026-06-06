--
-- V22__purchase_orders.sql
--
-- Purchase orders represent expected supplier purchases and never modify stock.
--

CREATE TABLE purchase_orders (
    id BIGSERIAL PRIMARY KEY,
    supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
    branch_id BIGINT NOT NULL REFERENCES branches(id),
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    order_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    expected_delivery_date DATE,
    notes TEXT,
    created_by_user_id BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    confirmed_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,

    CONSTRAINT chk_purchase_orders_status CHECK (status IN ('DRAFT', 'CONFIRMED', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'))
);

CREATE TABLE purchase_order_items (
    id BIGSERIAL PRIMARY KEY,
    purchase_order_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    supplier_product_id BIGINT REFERENCES supplier_products(id),
    quantity_ordered DECIMAL(12, 3) NOT NULL,
    unit_cost DECIMAL(12, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    CONSTRAINT chk_purchase_order_items_quantity CHECK (quantity_ordered > 0),
    CONSTRAINT chk_purchase_order_items_unit_cost CHECK (unit_cost >= 0),
    CONSTRAINT chk_purchase_order_items_subtotal CHECK (subtotal >= 0)
);

CREATE INDEX idx_purchase_orders_supplier_status ON purchase_orders (supplier_id, status);
CREATE INDEX idx_purchase_orders_branch_status ON purchase_orders (branch_id, status);
CREATE INDEX idx_purchase_orders_created_at ON purchase_orders (created_at DESC);
CREATE INDEX idx_purchase_order_items_order_id ON purchase_order_items (purchase_order_id);
CREATE INDEX idx_purchase_order_items_supplier_product_id ON purchase_order_items (supplier_product_id);

COMMENT ON TABLE purchase_orders IS 'Supplier purchase intention. Does not create stock lots or stock movements.';
COMMENT ON TABLE purchase_order_items IS 'Expected products, quantities and cost snapshots in a purchase order.';
