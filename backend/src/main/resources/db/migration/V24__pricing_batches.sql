--
-- V24__pricing_batches.sql
--
-- Pricing rules, sale price history, and reviewed supplier price/catalog update batches.
-- Batches update replacement costs and sale prices only after human confirmation.
-- They never modify stock lots or stock movements.
--

CREATE TABLE product_sale_price_history (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id),
    old_price DECIMAL(12, 2),
    new_price DECIMAL(12, 2) NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_to TIMESTAMPTZ,
    reason VARCHAR(100),
    source VARCHAR(50),
    reference_type VARCHAR(50),
    reference_id BIGINT,
    created_by_user_id BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    CONSTRAINT chk_product_sale_price_history_old CHECK (old_price IS NULL OR old_price >= 0),
    CONSTRAINT chk_product_sale_price_history_new CHECK (new_price >= 0)
);

CREATE TABLE pricing_rules (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category_id BIGINT REFERENCES categories(id),
    product_id BIGINT REFERENCES products(id),
    target_margin_percentage DECIMAL(5, 2) NOT NULL,
    rounding_multiple DECIMAL(12, 2) NOT NULL DEFAULT 100,
    active BOOLEAN DEFAULT true NOT NULL,
    priority INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    CONSTRAINT chk_pricing_rules_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT chk_pricing_rules_margin CHECK (target_margin_percentage >= 0 AND target_margin_percentage < 100),
    CONSTRAINT chk_pricing_rules_rounding CHECK (rounding_multiple > 0),
    CONSTRAINT chk_pricing_rules_single_scope CHECK (category_id IS NULL OR product_id IS NULL)
);

CREATE TABLE price_update_batches (
    id BIGSERIAL PRIMARY KEY,
    supplier_id BIGINT REFERENCES suppliers(id),
    type VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    source_file_name VARCHAR(255),
    default_new_product_margin_percentage DECIMAL(5, 2),
    default_rounding_multiple DECIMAL(12, 2),
    apply_cost_updates_by_default BOOLEAN DEFAULT true NOT NULL,
    apply_sale_price_updates_by_default BOOLEAN DEFAULT true NOT NULL,
    exclude_unchanged_by_default BOOLEAN DEFAULT true NOT NULL,
    pricing_rule_id BIGINT REFERENCES pricing_rules(id),
    created_by_user_id BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    applied_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    notes TEXT,

    CONSTRAINT chk_price_update_batches_type CHECK (type IN ('SUPPLIER_FILE', 'PERCENTAGE_INCREASE', 'MANUAL_GRID', 'SINGLE_PRODUCT_MANUAL')),
    CONSTRAINT chk_price_update_batches_status CHECK (status IN ('DRAFT', 'VALIDATED', 'APPLIED', 'CANCELLED')),
    CONSTRAINT chk_price_update_batches_margin CHECK (default_new_product_margin_percentage IS NULL OR (default_new_product_margin_percentage >= 0 AND default_new_product_margin_percentage < 100)),
    CONSTRAINT chk_price_update_batches_rounding CHECK (default_rounding_multiple IS NULL OR default_rounding_multiple > 0)
);

CREATE TABLE price_update_batch_items (
    id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT NOT NULL REFERENCES price_update_batches(id) ON DELETE CASCADE,
    supplier_product_id BIGINT REFERENCES supplier_products(id),
    product_id BIGINT REFERENCES products(id),
    supplier_sku VARCHAR(100),
    supplier_product_name VARCHAR(255),
    barcode VARCHAR(100),
    old_cost DECIMAL(12, 2),
    new_cost DECIMAL(12, 2),
    supplier_variation_percentage DECIMAL(8, 3),
    new_product_margin_percentage DECIMAL(5, 2),
    old_sale_price DECIMAL(12, 2),
    suggested_sale_price DECIMAL(12, 2),
    final_sale_price DECIMAL(12, 2),
    apply_cost_update BOOLEAN DEFAULT true NOT NULL,
    apply_sale_price_update BOOLEAN DEFAULT true NOT NULL,
    create_product BOOLEAN DEFAULT false NOT NULL,
    status VARCHAR(30) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    CONSTRAINT chk_price_update_batch_items_status CHECK (status IN ('CREATE', 'UPDATE', 'UNCHANGED', 'REVIEW', 'EXCLUDED', 'ERROR')),
    CONSTRAINT chk_price_update_batch_items_old_cost CHECK (old_cost IS NULL OR old_cost >= 0),
    CONSTRAINT chk_price_update_batch_items_new_cost CHECK (new_cost IS NULL OR new_cost >= 0),
    CONSTRAINT chk_price_update_batch_items_margin CHECK (new_product_margin_percentage IS NULL OR (new_product_margin_percentage >= 0 AND new_product_margin_percentage < 100)),
    CONSTRAINT chk_price_update_batch_items_prices CHECK (
        (old_sale_price IS NULL OR old_sale_price >= 0)
        AND (suggested_sale_price IS NULL OR suggested_sale_price >= 0)
        AND (final_sale_price IS NULL OR final_sale_price >= 0)
    )
);

CREATE INDEX idx_product_sale_price_history_product ON product_sale_price_history (product_id, valid_from DESC);
CREATE INDEX idx_pricing_rules_active ON pricing_rules (active, priority DESC);
CREATE INDEX idx_pricing_rules_category ON pricing_rules (category_id);
CREATE INDEX idx_pricing_rules_product ON pricing_rules (product_id);
CREATE INDEX idx_price_update_batches_supplier_status ON price_update_batches (supplier_id, status);
CREATE INDEX idx_price_update_batches_created_at ON price_update_batches (created_at DESC);
CREATE INDEX idx_price_update_batch_items_batch ON price_update_batch_items (batch_id);
CREATE INDEX idx_price_update_batch_items_product ON price_update_batch_items (product_id);
CREATE INDEX idx_price_update_batch_items_supplier_product ON price_update_batch_items (supplier_product_id);

COMMENT ON TABLE price_update_batches IS 'Reviewed supplier price and catalog update batches applied only after human confirmation.';
COMMENT ON TABLE price_update_batch_items IS 'Per-row preview and override values for supplier price and catalog update batches.';
