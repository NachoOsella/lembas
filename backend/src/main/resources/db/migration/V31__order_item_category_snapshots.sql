ALTER TABLE order_items
    ADD COLUMN category_id_snapshot BIGINT,
    ADD COLUMN category_name_snapshot VARCHAR(255);

UPDATE order_items oi
SET category_id_snapshot = c.id,
    category_name_snapshot = c.name
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
WHERE p.id = oi.product_id;

CREATE INDEX idx_order_items_category_snapshot
    ON order_items (category_id_snapshot);
