--
-- V2__catalog.sql
--
-- Catalog tables: categories and products (Sprint 1, S1-US03).
--
-- Subtasks:
--    LEMBAS-74: Crear V2__catalog.sql con categories y products
--

-- =============================================================================
-- Categories
-- =============================================================================
CREATE TABLE categories (
    id          BIGSERIAL       PRIMARY KEY,
    parent_id   BIGINT          REFERENCES categories(id),
    name        VARCHAR(255)    NOT NULL,
    description TEXT
);

COMMENT ON TABLE categories IS 'Product categories with optional self-referencing hierarchy (parent_id for subcategories).';

-- =============================================================================
-- Products
-- =============================================================================
CREATE TABLE products (
    id              BIGSERIAL       PRIMARY KEY,
    category_id     BIGINT          REFERENCES categories(id),
    name            VARCHAR(255)    NOT NULL,
    description     TEXT,
    brand_name      VARCHAR(255),
    barcode         VARCHAR(100)    UNIQUE,
    online_status   VARCHAR(20)     DEFAULT 'DRAFT',
    image_url       VARCHAR(500),
    sale_price      DECIMAL(12, 2)  NOT NULL,
    minimum_stock   INT,
    active          BOOLEAN         DEFAULT true,
    created_at      TIMESTAMPTZ     DEFAULT now(),
    updated_at      TIMESTAMPTZ     DEFAULT now(),

    CONSTRAINT chk_product_sale_price
        CHECK (sale_price >= 0),
    CONSTRAINT chk_product_online_status
        CHECK (online_status IN ('DRAFT', 'PUBLISHED', 'PAUSED', 'HIDDEN'))
);

COMMENT ON TABLE products IS 'Global product catalog. Products are shared across all branches; stock is per-branch via stock_lots.';

COMMENT ON COLUMN products.online_status IS 'Visibility in the online store: DRAFT, PUBLISHED, PAUSED, HIDDEN.';

-- Recommended indexes for catalog queries
CREATE INDEX idx_products_barcode ON products (barcode);
CREATE INDEX idx_products_category_id ON products (category_id);
CREATE INDEX idx_products_online_status ON products (online_status);
