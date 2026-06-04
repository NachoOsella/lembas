--
-- V18__inventory.sql
--
-- Inventory tables: stock lots and stock movements (Sprint 2, S2-US01).
--
-- Subtasks:
--    LEMBAS-214: Crear migracion de inventario con stock_lots y stock_movements
--    LEMBAS-216: Crear indices por product_id, branch_id y expiration_date
--

-- =============================================================================
-- Stock lots
-- =============================================================================
CREATE TABLE stock_lots (
    id                  BIGSERIAL       PRIMARY KEY,
    product_id          BIGINT          NOT NULL REFERENCES products(id),
    branch_id           BIGINT          NOT NULL REFERENCES branches(id),
    quantity_available  DECIMAL(12, 3)  NOT NULL,
    lot_code            VARCHAR(100),
    expiration_date     DATE,
    cost_price          DECIMAL(12, 2),
    created_at          TIMESTAMPTZ     DEFAULT now() NOT NULL,
    updated_at          TIMESTAMPTZ     DEFAULT now() NOT NULL,

    CONSTRAINT chk_stock_lots_quantity_available
        CHECK (quantity_available >= 0),
    CONSTRAINT chk_stock_lots_cost_price
        CHECK (cost_price IS NULL OR cost_price >= 0)
);

COMMENT ON TABLE stock_lots IS 'Inventory lots by product, branch, and optional expiration date. Single source of truth for available stock.';
COMMENT ON COLUMN stock_lots.quantity_available IS 'Current available quantity for this lot. Supports fractional products.';
COMMENT ON COLUMN stock_lots.expiration_date IS 'Optional date used for FEFO ordering; NULL expiration lots are consumed last.';

-- =============================================================================
-- Stock movements
-- =============================================================================
CREATE TABLE stock_movements (
    id          BIGSERIAL       PRIMARY KEY,
    stock_lot_id BIGINT         NOT NULL REFERENCES stock_lots(id),
    product_id  BIGINT          NOT NULL REFERENCES products(id),
    branch_id   BIGINT          NOT NULL REFERENCES branches(id),
    type        VARCHAR(30)     NOT NULL,
    quantity    DECIMAL(12, 3)  NOT NULL,
    order_id    BIGINT,
    reason      VARCHAR(500),
    created_at  TIMESTAMPTZ     DEFAULT now() NOT NULL,

    CONSTRAINT chk_stock_movements_type
        CHECK (type IN (
            'PURCHASE_ENTRY',
            'POS_SALE',
            'ONLINE_SALE',
            'CANCELLATION_RETURN',
            'MANUAL_ADJUSTMENT',
            'WASTE',
            'INTERNAL_CONSUMPTION'
        )),
    CONSTRAINT chk_stock_movements_quantity
        CHECK (quantity <> 0)
);

COMMENT ON TABLE stock_movements IS 'Append-only trace of inventory changes by lot.';
COMMENT ON COLUMN stock_movements.quantity IS 'Signed quantity: positive entries/returns, negative sales/waste/consumption.';
COMMENT ON COLUMN stock_movements.order_id IS 'Order id related to a sale or cancellation. Foreign key is added when orders table is introduced.';

-- Recommended indexes for inventory availability and FEFO queries.
CREATE INDEX idx_stock_lots_product_id ON stock_lots (product_id);
CREATE INDEX idx_stock_lots_branch_id ON stock_lots (branch_id);
CREATE INDEX idx_stock_lots_expiration_date ON stock_lots (expiration_date);
CREATE INDEX idx_stock_lots_fefo ON stock_lots (product_id, branch_id, expiration_date, id)
    WHERE quantity_available > 0;

CREATE INDEX idx_stock_movements_product_id ON stock_movements (product_id);
CREATE INDEX idx_stock_movements_branch_id ON stock_movements (branch_id);
CREATE INDEX idx_stock_movements_stock_lot_id ON stock_movements (stock_lot_id);
CREATE INDEX idx_stock_movements_order_id ON stock_movements (order_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements (created_at);
