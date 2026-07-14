-- Tests own their transactional fixtures; remove demo report rows after production migrations.
DELETE FROM cash_movements;
DELETE FROM payments;
DELETE FROM stock_movements;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM cash_sessions;
DELETE FROM purchase_receipt_items;
DELETE FROM purchase_receipts;
DELETE FROM purchase_order_items;
DELETE FROM purchase_orders;
DELETE FROM stock_lots;
