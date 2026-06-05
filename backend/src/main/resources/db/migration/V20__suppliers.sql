--
-- V20__suppliers.sql
--
-- Supplier registry, product-supplier replacement costs, and replacement cost history.
--

CREATE TABLE suppliers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    cuit VARCHAR(20) UNIQUE,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    CONSTRAINT chk_suppliers_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT chk_suppliers_email_basic CHECK (email IS NULL OR position('@' IN email) > 1)
);

CREATE TABLE supplier_products (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id),
    supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
    supplier_sku VARCHAR(100),
    current_cost DECIMAL(12, 2) NOT NULL,
    is_preferred BOOLEAN DEFAULT false NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    CONSTRAINT uk_supplier_products_product_supplier UNIQUE (product_id, supplier_id),
    CONSTRAINT chk_supplier_products_current_cost CHECK (current_cost >= 0)
);

CREATE TABLE supplier_product_cost_history (
    id BIGSERIAL PRIMARY KEY,
    supplier_product_id BIGINT NOT NULL REFERENCES supplier_products(id),
    old_cost DECIMAL(12, 2),
    new_cost DECIMAL(12, 2) NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_to TIMESTAMPTZ,
    source VARCHAR(50),
    reference_type VARCHAR(50),
    reference_id BIGINT,
    created_by_user_id BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    CONSTRAINT chk_supplier_cost_history_old_cost CHECK (old_cost IS NULL OR old_cost >= 0),
    CONSTRAINT chk_supplier_cost_history_new_cost CHECK (new_cost >= 0)
);

CREATE INDEX idx_suppliers_name ON suppliers (name);
CREATE INDEX idx_suppliers_active ON suppliers (active);
CREATE INDEX idx_supplier_products_product_id ON supplier_products (product_id);
CREATE INDEX idx_supplier_products_supplier_id ON supplier_products (supplier_id);
CREATE INDEX idx_supplier_products_active ON supplier_products (active);
CREATE INDEX idx_supplier_cost_history_supplier_product ON supplier_product_cost_history (supplier_product_id, valid_from DESC);
