--
-- V30__seed_report_demo_data.sql
--
-- Comprehensive seed data for the report pages and dashboard (Sprint 4).
--
-- Adds stock lots, purchase orders, POS/ONLINE orders with payments, and
-- cash sessions so every report endpoint returns meaningful data. All inserts
-- are idempotent and safe to re-run on an existing database.
--
-- Subtasks:
--   - Seed stock lots (unit cost + quantities) for the demo products
--   - Seed purchase orders with items for the suppliers report
--   - Seed POS + ONLINE orders with items and payments for sales reports
--   - Seed cash sessions with linked POS payments for the cash report
--   - Advance the order_number_seq past the seeded order_number values
--

-- Advance the sequence so that future generator calls do not collide with
-- our manual order_number values. We'll insert up to 50 orders in this seed,
-- so advance to 100.
SELECT setval('order_number_seq', 100, false);

-- =============================================================================
-- Stock lots
-- =============================================================================
-- Create stock lots for the demo products at branch Centro. Each lot has a
-- unit_cost, quantity_available, initial_quantity, status ACTIVE, and some
-- will have an expiration_date for FEFO reports.

INSERT INTO stock_lots (
    product_id, branch_id, quantity_available, initial_quantity,
    unit_cost, cost_price, lot_code, expiration_date, status,
    created_at, updated_at
)
SELECT
    p.id,
    b.id,
    CASE p.barcode
        WHEN '7790001000012' THEN 42.000  WHEN '7790001000029' THEN 78.000
        WHEN '7790001000036' THEN 18.000  WHEN '7790001000043' THEN 14.000
        WHEN '7790001000050' THEN 25.000  WHEN '7790002000012' THEN 30.000
        WHEN '7790002000029' THEN 22.000  WHEN '7790002000036' THEN 55.000
        WHEN '7790002000043' THEN 88.000  WHEN '7790002000050' THEN 35.000
        WHEN '7790002000067' THEN 12.000  WHEN '7790002000074' THEN 28.000
        WHEN '7790002000081' THEN 16.000  WHEN '7790002000098' THEN 40.000
        WHEN '7790002000104' THEN 20.000  WHEN '7790003000012' THEN 65.000
        WHEN '7790003000029' THEN 45.000  WHEN '7790003000036' THEN 38.000
        WHEN '7790003000043' THEN 22.000  WHEN '7790003000050' THEN 30.000
        WHEN '7790004000012' THEN 15.000  WHEN '7790004000029' THEN 20.000
        WHEN '7790004000036' THEN 25.000  WHEN '7790004000043' THEN 35.000
        WHEN '7790004000098' THEN 18.000  WHEN '7790005000012' THEN 22.000
        WHEN '7790005000029' THEN 28.000  WHEN '7790005000036' THEN 32.000
        WHEN '7790005000067' THEN 10.000  WHEN '7790006000012' THEN 18.000
        WHEN '7790006000029' THEN 48.000  WHEN '7790006000036' THEN 30.000
        WHEN '7790006000043' THEN 72.000  WHEN '7790006000074' THEN 35.000
        WHEN '7790006000098' THEN 25.000
        ELSE 10.000
    END,
    CASE p.barcode
        WHEN '7790001000012' THEN 50.000  WHEN '7790001000029' THEN 100.000
        WHEN '7790001000036' THEN 30.000  WHEN '7790001000043' THEN 20.000
        WHEN '7790001000050' THEN 40.000  WHEN '7790002000012' THEN 40.000
        WHEN '7790002000029' THEN 30.000  WHEN '7790002000036' THEN 80.000
        WHEN '7790002000043' THEN 120.000 WHEN '7790002000050' THEN 50.000
        WHEN '7790002000067' THEN 20.000  WHEN '7790002000074' THEN 40.000
        WHEN '7790002000081' THEN 20.000  WHEN '7790002000098' THEN 60.000
        WHEN '7790002000104' THEN 30.000  WHEN '7790003000012' THEN 80.000
        WHEN '7790003000029' THEN 60.000  WHEN '7790003000036' THEN 50.000
        WHEN '7790003000043' THEN 30.000  WHEN '7790003000050' THEN 40.000
        WHEN '7790004000012' THEN 20.000  WHEN '7790004000029' THEN 25.000
        WHEN '7790004000036' THEN 30.000  WHEN '7790004000043' THEN 50.000
        WHEN '7790004000098' THEN 24.000  WHEN '7790005000012' THEN 30.000
        WHEN '7790005000029' THEN 35.000  WHEN '7790005000036' THEN 40.000
        WHEN '7790005000067' THEN 15.000  WHEN '7790006000012' THEN 25.000
        WHEN '7790006000029' THEN 60.000  WHEN '7790006000036' THEN 40.000
        WHEN '7790006000043' THEN 90.000  WHEN '7790006000074' THEN 50.000
        WHEN '7790006000098' THEN 35.000
        ELSE 20.000
    END,
    CASE p.barcode
        WHEN '7790001000012' THEN 2900.00 WHEN '7790001000029' THEN 2200.00
        WHEN '7790001000036' THEN 5100.00 WHEN '7790001000043' THEN 4800.00
        WHEN '7790001000050' THEN 3500.00 WHEN '7790002000012' THEN 3200.00
        WHEN '7790002000029' THEN 2800.00 WHEN '7790002000036' THEN 1900.00
        WHEN '7790002000043' THEN 1100.00 WHEN '7790002000050' THEN 1600.00
        WHEN '7790002000067' THEN 3200.00 WHEN '7790002000074' THEN 3300.00
        WHEN '7790002000081' THEN 2100.00 WHEN '7790002000098' THEN 2400.00
        WHEN '7790002000104' THEN 1700.00 WHEN '7790003000012' THEN 1000.00
        WHEN '7790003000029' THEN 1800.00 WHEN '7790003000036' THEN 1400.00
        WHEN '7790003000043' THEN 1500.00 WHEN '7790003000050' THEN 1600.00
        WHEN '7790004000012' THEN 7500.00 WHEN '7790004000029' THEN 5500.00
        WHEN '7790004000036' THEN 4200.00 WHEN '7790004000043' THEN 3200.00
        WHEN '7790004000098' THEN 4800.00 WHEN '7790005000012' THEN 2700.00
        WHEN '7790005000029' THEN 2300.00 WHEN '7790005000036' THEN 2000.00
        WHEN '7790005000067' THEN 5200.00 WHEN '7790006000012' THEN 3800.00
        WHEN '7790006000029' THEN 1600.00 WHEN '7790006000036' THEN 2400.00
        WHEN '7790006000043' THEN 800.00  WHEN '7790006000074' THEN 1800.00
        WHEN '7790006000098' THEN 2100.00
        ELSE 2500.00
    END,
    CASE p.barcode
        WHEN '7790001000012' THEN 2900.00 WHEN '7790001000029' THEN 2200.00
        WHEN '7790001000036' THEN 5100.00 WHEN '7790001000043' THEN 4800.00
        WHEN '7790001000050' THEN 3500.00 WHEN '7790002000012' THEN 3200.00
        WHEN '7790002000029' THEN 2800.00 WHEN '7790002000036' THEN 1900.00
        WHEN '7790002000043' THEN 1100.00 WHEN '7790002000050' THEN 1600.00
        ELSE 2500.00
    END,
    CASE p.barcode
        WHEN '7790001000012' THEN 'LOT-A-001'  WHEN '7790001000029' THEN 'LOT-B-002'
        WHEN '7790001000036' THEN 'LOT-C-003'  WHEN '7790001000043' THEN 'LOT-D-004'
        WHEN '7790001000050' THEN 'LOT-E-005'  WHEN '7790002000012' THEN 'LOT-F-006'
        WHEN '7790002000029' THEN 'LOT-G-007'  WHEN '7790002000036' THEN 'LOT-H-008'
        WHEN '7790002000043' THEN 'LOT-I-009'  WHEN '7790002000050' THEN 'LOT-J-010'
        ELSE 'LOT-DEF-' || p.barcode
    END,
    CASE
        WHEN p.barcode = '7790002000036' THEN CURRENT_DATE + INTERVAL '45 days'
        WHEN p.barcode = '7790002000043' THEN CURRENT_DATE + INTERVAL '60 days'
        WHEN p.barcode = '7790003000012' THEN CURRENT_DATE + INTERVAL '15 days'
        WHEN p.barcode = '7790003000029' THEN CURRENT_DATE + INTERVAL '90 days'
        WHEN p.barcode = '7790003000036' THEN CURRENT_DATE + INTERVAL '20 days'
        WHEN p.barcode = '7790004000012' THEN CURRENT_DATE + INTERVAL '120 days'
        WHEN p.barcode = '7790004000029' THEN CURRENT_DATE + INTERVAL '180 days'
        WHEN p.barcode = '7790004000036' THEN CURRENT_DATE + INTERVAL '90 days'
        WHEN p.barcode = '7790006000012' THEN CURRENT_DATE + INTERVAL '25 days'
        ELSE NULL
    END,
    'ACTIVE',
    CURRENT_DATE - INTERVAL '60 days',
    CURRENT_DATE - INTERVAL '60 days'
FROM products p
CROSS JOIN branches b
WHERE b.name = 'Centro'
  AND p.barcode IN (
      '7790001000012','7790001000029','7790001000036','7790001000043','7790001000050',
      '7790002000012','7790002000029','7790002000036','7790002000043','7790002000050',
      '7790002000067','7790002000074','7790002000081','7790002000098','7790002000104',
      '7790003000012','7790003000029','7790003000036','7790003000043','7790003000050',
      '7790004000012','7790004000029','7790004000036','7790004000043','7790004000098',
      '7790005000012','7790005000029','7790005000036','7790005000067',
      '7790006000012','7790006000029','7790006000036','7790006000043','7790006000074','7790006000098'
  )
  AND NOT EXISTS (
      SELECT 1 FROM stock_lots sl2
      WHERE sl2.product_id = p.id
        AND sl2.branch_id = b.id
        AND sl2.status = 'ACTIVE'
  );

-- =============================================================================
-- Purchase orders, cash sessions, POS orders and ONLINE orders
-- =============================================================================
-- Uses a DO block to mix DML with PL/pgSQL control flow (variables, loops,
-- conditionals). All PL/pgSQL variables are prefixed with v_ to avoid ambiguity
-- with column names of the same name (e.g. v_branch_id, v_order_id).

DO $$
DECLARE
    v_branch_id   BIGINT;
    sup1_id       BIGINT;
    sup2_id       BIGINT;
    sup3_id       BIGINT;
    i             INT;
    v_order_id    BIGINT;
    v_order_total DECIMAL(12,2);
    closed_sid    BIGINT;
    open_sid      BIGINT;
    emp_user_id   BIGINT;
    cust_user_id  BIGINT;
    day_offset    INT;
BEGIN
    SELECT id INTO v_branch_id   FROM branches WHERE name = 'Centro';
    SELECT id INTO sup1_id       FROM suppliers WHERE cuit = '30-71234567-8';
    SELECT id INTO sup2_id       FROM suppliers WHERE cuit = '30-69876543-2';
    SELECT id INTO sup3_id       FROM suppliers WHERE cuit = '30-55667788-9';
    SELECT id INTO emp_user_id   FROM users WHERE email = 'empleado@lembas.com';
    SELECT id INTO cust_user_id  FROM users WHERE email = 'customer@lembas.com';

    -- =========================================================================
    -- Purchase orders (6 orders with items for the suppliers report)
    -- =========================================================================

    INSERT INTO purchase_orders (supplier_id, branch_id, status, order_date, confirmed_at, created_at, updated_at)
    VALUES (sup1_id, v_branch_id, 'CONFIRMED', CURRENT_DATE - 90, CURRENT_DATE - 87, CURRENT_DATE - 90, CURRENT_DATE - 87)
    RETURNING id INTO v_order_id;
    INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity_ordered, unit_cost, subtotal)
    SELECT v_order_id, p.id, 10.000, 2900.00, 10 * 2900.00 FROM products p WHERE p.barcode = '7790001000012'
    UNION ALL
    SELECT v_order_id, p.id, 20.000, 2200.00, 20 * 2200.00 FROM products p WHERE p.barcode = '7790001000029';

    INSERT INTO purchase_orders (supplier_id, branch_id, status, order_date, confirmed_at, created_at, updated_at)
    VALUES (sup2_id, v_branch_id, 'CONFIRMED', CURRENT_DATE - 60, CURRENT_DATE - 58, CURRENT_DATE - 60, CURRENT_DATE - 58)
    RETURNING id INTO v_order_id;
    INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity_ordered, unit_cost, subtotal)
    SELECT v_order_id, p.id, 15.000, 1900.00, 15 * 1900.00 FROM products p WHERE p.barcode = '7790002000036'
    UNION ALL
    SELECT v_order_id, p.id, 30.000, 1100.00, 30 * 1100.00 FROM products p WHERE p.barcode = '7790002000043'
    UNION ALL
    SELECT v_order_id, p.id, 12.000, 1600.00, 12 * 1600.00 FROM products p WHERE p.barcode = '7790002000050';

    INSERT INTO purchase_orders (supplier_id, branch_id, status, order_date, confirmed_at, sent_at, created_at, updated_at)
    VALUES (sup1_id, v_branch_id, 'SENT', CURRENT_DATE - 45, CURRENT_DATE - 43, CURRENT_DATE - 42, CURRENT_DATE - 45, CURRENT_DATE - 42)
    RETURNING id INTO v_order_id;
    INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity_ordered, unit_cost, subtotal)
    SELECT v_order_id, p.id, 8.000, 7500.00, 8 * 7500.00 FROM products p WHERE p.barcode = '7790004000012'
    UNION ALL
    SELECT v_order_id, p.id, 10.000, 5500.00, 10 * 5500.00 FROM products p WHERE p.barcode = '7790004000029'
    UNION ALL
    SELECT v_order_id, p.id, 12.000, 4200.00, 12 * 4200.00 FROM products p WHERE p.barcode = '7790004000036';

    INSERT INTO purchase_orders (supplier_id, branch_id, status, order_date, confirmed_at, created_at, updated_at)
    VALUES (sup3_id, v_branch_id, 'CONFIRMED', CURRENT_DATE - 30, CURRENT_DATE - 28, CURRENT_DATE - 30, CURRENT_DATE - 28)
    RETURNING id INTO v_order_id;
    INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity_ordered, unit_cost, subtotal)
    SELECT v_order_id, p.id, 10.000, 2700.00, 10 * 2700.00 FROM products p WHERE p.barcode = '7790005000012'
    UNION ALL
    SELECT v_order_id, p.id, 15.000, 2000.00, 15 * 2000.00 FROM products p WHERE p.barcode = '7790005000036';

    INSERT INTO purchase_orders (supplier_id, branch_id, status, order_date, created_at, updated_at)
    VALUES (sup2_id, v_branch_id, 'DRAFT', CURRENT_DATE - 15, CURRENT_DATE - 15, CURRENT_DATE - 15)
    RETURNING id INTO v_order_id;
    INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity_ordered, unit_cost, subtotal)
    SELECT v_order_id, p.id, 20.000, 3200.00, 20 * 3200.00 FROM products p WHERE p.barcode = '7790002000012'
    UNION ALL
    SELECT v_order_id, p.id, 15.000, 2800.00, 15 * 2800.00 FROM products p WHERE p.barcode = '7790002000029';

    INSERT INTO purchase_orders (supplier_id, branch_id, status, order_date, confirmed_at, sent_at, created_at, updated_at)
    VALUES (sup1_id, v_branch_id, 'RECEIVED', CURRENT_DATE - 7, CURRENT_DATE - 6, CURRENT_DATE - 5, CURRENT_DATE - 7, CURRENT_DATE - 3)
    RETURNING id INTO v_order_id;
    INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity_ordered, unit_cost, subtotal)
    SELECT v_order_id, p.id, 25.000, 3800.00, 25 * 3800.00 FROM products p WHERE p.barcode = '7790006000012'
    UNION ALL
    SELECT v_order_id, p.id, 40.000, 1600.00, 40 * 1600.00 FROM products p WHERE p.barcode = '7790006000029'
    UNION ALL
    SELECT v_order_id, p.id, 20.000, 1800.00, 20 * 1800.00 FROM products p WHERE p.barcode = '7790006000074';

    -- =========================================================================
    -- Cash sessions (reuse existing if already present)
    -- =========================================================================

    SELECT cs.id INTO open_sid FROM cash_sessions cs
    WHERE cs.status = 'OPEN' AND cs.branch_id = v_branch_id
    LIMIT 1;

    SELECT cs.id INTO closed_sid FROM cash_sessions cs
    WHERE cs.status = 'CLOSED' AND cs.branch_id = v_branch_id
      AND cs.opened_at >= (CURRENT_DATE - 2)::timestamptz
    ORDER BY cs.opened_at DESC LIMIT 1;

    IF open_sid IS NULL THEN
        INSERT INTO cash_sessions (
            branch_id, opened_by_user_id, closed_by_user_id,
            opened_at, closed_at,
            opening_cash_amount, expected_cash_amount, counted_cash_amount,
            cash_difference_amount, status, created_at, updated_at
        ) VALUES (
            v_branch_id, emp_user_id, emp_user_id,
            (CURRENT_DATE - 1)::timestamptz + '08:00:00'::interval,
            (CURRENT_DATE - 1)::timestamptz + '19:00:00'::interval,
            5000.00, 0.00, 0.00, 0.00,
            'CLOSED',
            (CURRENT_DATE - 1)::timestamptz + '08:00:00'::interval,
            (CURRENT_DATE - 1)::timestamptz + '19:00:00'::interval
        )
        RETURNING id INTO closed_sid;

        INSERT INTO cash_sessions (
            branch_id, opened_by_user_id, opened_at,
            opening_cash_amount, status, created_at, updated_at
        ) VALUES (
            v_branch_id, emp_user_id,
            CURRENT_DATE::timestamptz + '08:00:00'::interval,
            5000.00, 'OPEN',
            CURRENT_DATE::timestamptz + '08:00:00'::interval,
            CURRENT_DATE::timestamptz + '08:00:00'::interval
        )
        RETURNING id INTO open_sid;
    END IF;

    IF closed_sid IS NULL THEN
        INSERT INTO cash_sessions (
            branch_id, opened_by_user_id, closed_by_user_id,
            opened_at, closed_at,
            opening_cash_amount, expected_cash_amount, counted_cash_amount,
            cash_difference_amount, status, created_at, updated_at
        ) VALUES (
            v_branch_id, emp_user_id, emp_user_id,
            (CURRENT_DATE - 1)::timestamptz + '08:00:00'::interval,
            (CURRENT_DATE - 1)::timestamptz + '19:00:00'::interval,
            5000.00, 0.00, 0.00, 0.00,
            'CLOSED',
            (CURRENT_DATE - 1)::timestamptz + '08:00:00'::interval,
            (CURRENT_DATE - 1)::timestamptz + '19:00:00'::interval
        )
        RETURNING id INTO closed_sid;
    END IF;

    -- =========================================================================
    -- POS orders (15 orders, first 5 linked to closed session, rest to open)
    -- =========================================================================

    FOR i IN 0..14 LOOP
        IF i < 5 THEN
            day_offset := 1;
        ELSE
            day_offset := 0;
        END IF;

        INSERT INTO orders (
            order_number, type, status, branch_id, created_by_user_id,
            cash_session_id, customer_name_snapshot,
            fulfillment_type, subtotal, discount_total, total,
            paid_at, created_at, updated_at
        ) VALUES (
            'POS-' || TO_CHAR((CURRENT_DATE - day_offset)::date, 'YYYYMMDD') || '-' || LPAD((i + 1)::text, 6, '0'),
            'POS', 'PAID', v_branch_id, emp_user_id,
            CASE WHEN i < 5 THEN closed_sid ELSE open_sid END,
            'Cliente POS-' || (i + 1),
            'PICKUP', 0, 0, 0,
            (CURRENT_DATE - day_offset)::timestamptz + ((8 + mod(i, 9))::text || ':00:00')::interval,
            (CURRENT_DATE - day_offset)::timestamptz + ((8 + mod(i, 9))::text || ':00:00')::interval,
            (CURRENT_DATE - day_offset)::timestamptz + ((8 + mod(i, 9))::text || ':00:00')::interval
        )
        RETURNING id, total INTO v_order_id, v_order_total;

        INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount_amount, subtotal_amount, product_name_snapshot, product_barcode_snapshot, cost_price_snapshot)
        SELECT v_order_id, p.id, 1.000, 4200.00, 0, 4200.00, p.name, p.barcode, 2900.00
        FROM products p WHERE p.barcode = '7790001000012';

        IF mod(i, 3) != 0 THEN
            INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount_amount, subtotal_amount, product_name_snapshot, product_barcode_snapshot, cost_price_snapshot)
            SELECT v_order_id, p.id, 1.000, 3100.00, 0, 3100.00, p.name, p.barcode, 2200.00
            FROM products p WHERE p.barcode = '7790001000029';
        END IF;

        IF mod(i, 2) = 0 THEN
            INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount_amount, subtotal_amount, product_name_snapshot, product_barcode_snapshot, cost_price_snapshot)
            SELECT v_order_id, p.id, 2.000, 1800.00, 0, 3600.00, p.name, p.barcode, 1100.00
            FROM products p WHERE p.barcode = '7790002000043';
        END IF;

        UPDATE orders o
        SET subtotal = COALESCE((SELECT sum(subtotal_amount) FROM order_items WHERE order_id = o.id), 0),
            total = COALESCE((SELECT sum(subtotal_amount) FROM order_items WHERE order_id = o.id), 0)
        WHERE o.id = v_order_id;

        IF mod(i, 5) = 0 THEN
            INSERT INTO payments (order_id, cash_session_id, provider, method, status, amount, currency, approved_at, created_at, updated_at)
            VALUES (v_order_id, CASE WHEN i < 5 THEN closed_sid ELSE open_sid END, 'MANUAL', 'QR', 'APPROVED',
                    (SELECT total FROM orders WHERE id = v_order_id), 'ARS',
                    (CURRENT_DATE - day_offset)::timestamptz + ((8 + mod(i, 9))::text || ':15:00')::interval,
                    (CURRENT_DATE - day_offset)::timestamptz + ((8 + mod(i, 9))::text || ':00:00')::interval,
                    (CURRENT_DATE - day_offset)::timestamptz + ((8 + mod(i, 9))::text || ':15:00')::interval);
        ELSIF mod(i, 5) = 1 THEN
            INSERT INTO payments (order_id, cash_session_id, provider, method, status, amount, currency, approved_at, created_at, updated_at)
            VALUES (v_order_id, CASE WHEN i < 5 THEN closed_sid ELSE open_sid END, 'MANUAL', 'DEBIT_CARD', 'APPROVED',
                    (SELECT total FROM orders WHERE id = v_order_id), 'ARS',
                    (CURRENT_DATE - day_offset)::timestamptz + ((8 + mod(i, 9))::text || ':15:00')::interval,
                    (CURRENT_DATE - day_offset)::timestamptz + ((8 + mod(i, 9))::text || ':00:00')::interval,
                    (CURRENT_DATE - day_offset)::timestamptz + ((8 + mod(i, 9))::text || ':15:00')::interval);
        ELSIF mod(i, 5) = 2 THEN
            INSERT INTO payments (order_id, cash_session_id, provider, method, status, amount, currency, approved_at, created_at, updated_at)
            VALUES (v_order_id, CASE WHEN i < 5 THEN closed_sid ELSE open_sid END, 'MANUAL', 'CREDIT_CARD', 'APPROVED',
                    (SELECT total FROM orders WHERE id = v_order_id), 'ARS',
                    (CURRENT_DATE - day_offset)::timestamptz + ((8 + mod(i, 9))::text || ':15:00')::interval,
                    (CURRENT_DATE - day_offset)::timestamptz + ((8 + mod(i, 9))::text || ':00:00')::interval,
                    (CURRENT_DATE - day_offset)::timestamptz + ((8 + mod(i, 9))::text || ':15:00')::interval);
        ELSE
            INSERT INTO payments (order_id, cash_session_id, provider, method, status, amount, currency, approved_at, created_at, updated_at)
            VALUES (v_order_id, CASE WHEN i < 5 THEN closed_sid ELSE open_sid END, 'MANUAL', 'CASH', 'APPROVED',
                    (SELECT total FROM orders WHERE id = v_order_id), 'ARS',
                    (CURRENT_DATE - day_offset)::timestamptz + ((8 + mod(i, 9))::text || ':15:00')::interval,
                    (CURRENT_DATE - day_offset)::timestamptz + ((8 + mod(i, 9))::text || ':00:00')::interval,
                    (CURRENT_DATE - day_offset)::timestamptz + ((8 + mod(i, 9))::text || ':15:00')::interval);
        END IF;
    END LOOP;

    -- Update closed cash session with calculated totals
    UPDATE cash_sessions cs
    SET
        expected_cash_amount = cs.opening_cash_amount + COALESCE((
            SELECT sum(p.amount) FROM payments p
            WHERE p.cash_session_id = cs.id AND p.status = 'APPROVED'
        ), 0),
        counted_cash_amount = cs.opening_cash_amount + COALESCE((
            SELECT sum(p.amount) FROM payments p
            WHERE p.cash_session_id = cs.id AND p.status = 'APPROVED' AND p.method = 'CASH'
        ), 0),
        cash_difference_amount = COALESCE((
            SELECT sum(p.amount) FROM payments p
            WHERE p.cash_session_id = cs.id AND p.status = 'APPROVED'
        ), 0) - COALESCE((
            SELECT sum(p.amount) FROM payments p
            WHERE p.cash_session_id = cs.id AND p.status = 'APPROVED' AND p.method = 'CASH'
        ), 0),
        updated_at = CURRENT_DATE::timestamptz + '19:00:00'::interval
    WHERE cs.id = closed_sid;

    -- =========================================================================
    -- ONLINE orders (20 orders with MERCADO_PAGO payments over last 14 days)
    -- =========================================================================

    FOR i IN 0..19 LOOP
        day_offset := i / 2;

        INSERT INTO orders (
            order_number, type, status, branch_id, customer_user_id,
            customer_name_snapshot, customer_email_snapshot, customer_phone_snapshot,
            fulfillment_type, subtotal, discount_total, total,
            paid_at, prepared_at, ready_at, delivered_at,
            created_at, updated_at
        ) VALUES (
            'ON-' || TO_CHAR((CURRENT_DATE - day_offset)::date, 'YYYYMMDD') || '-' || LPAD((50 + i + 1)::text, 6, '0'),
            'ONLINE', 'DELIVERED', v_branch_id, cust_user_id,
            'Cliente Demo', 'customer@lembas.com', '+54 351 555-0100',
            'PICKUP', 0, 0, 0,
            (CURRENT_DATE - day_offset)::timestamptz + ((10 + mod(i, 5))::text || ':00:00')::interval,
            (CURRENT_DATE - day_offset)::timestamptz + ((11 + mod(i, 5))::text || ':00:00')::interval,
            (CURRENT_DATE - day_offset)::timestamptz + ((12 + mod(i, 5))::text || ':00:00')::interval,
            (CURRENT_DATE - day_offset)::timestamptz + ((13 + mod(i, 5))::text || ':00:00')::interval,
            (CURRENT_DATE - day_offset)::timestamptz + ((9 + mod(i, 5))::text  || ':00:00')::interval,
            (CURRENT_DATE - day_offset)::timestamptz + ((13 + mod(i, 5))::text || ':00:00')::interval
        )
        RETURNING id, total INTO v_order_id, v_order_total;

        INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount_amount, subtotal_amount, product_name_snapshot, product_barcode_snapshot, cost_price_snapshot)
        SELECT v_order_id, p.id, CASE WHEN mod(i, 3) = 0 THEN 2.000 ELSE 1.000 END, 4200.00, 0,
               CASE WHEN mod(i, 3) = 0 THEN 8400.00 ELSE 4200.00 END,
               p.name, p.barcode, 2900.00
        FROM products p WHERE p.barcode = '7790001000012';

        IF mod(i, 4) != 0 THEN
            INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount_amount, subtotal_amount, product_name_snapshot, product_barcode_snapshot, cost_price_snapshot)
            SELECT v_order_id, p.id, 1.000, 3100.00, 0, 3100.00, p.name, p.barcode, 2200.00
            FROM products p WHERE p.barcode = '7790001000029';
        END IF;

        IF mod(i, 5) = 0 THEN
            INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount_amount, subtotal_amount, product_name_snapshot, product_barcode_snapshot, cost_price_snapshot)
            SELECT v_order_id, p.id, 1.000, 18500.00, 500.00, 18000.00, p.name, p.barcode, 5100.00
            FROM products p WHERE p.barcode = '7790001000036';
        END IF;

        UPDATE orders o
        SET subtotal = COALESCE((SELECT sum(subtotal_amount) FROM order_items WHERE order_id = o.id), 0),
            total = COALESCE((SELECT sum(subtotal_amount) FROM order_items WHERE order_id = o.id), 0)
        WHERE o.id = v_order_id;

        INSERT INTO payments (order_id, provider, method, status, amount, currency,
                              provider_payment_id, provider_preference_id, external_reference,
                              approved_at, created_at, updated_at)
        VALUES (v_order_id, 'MERCADO_PAGO', 'CHECKOUT_PRO', 'APPROVED',
                (SELECT total FROM orders WHERE id = v_order_id), 'ARS',
                'MP-SEED-' || v_order_id,
                'PREF-SEED-' || v_order_id,
                'EXT-SEED-' || v_order_id,
                (CURRENT_DATE - day_offset)::timestamptz + ((10 + mod(i, 5))::text || ':05:00')::interval,
                (CURRENT_DATE - day_offset)::timestamptz + ((9 + mod(i, 5))::text  || ':50:00')::interval,
                (CURRENT_DATE - day_offset)::timestamptz + ((10 + mod(i, 5))::text || ':05:00')::interval);
    END LOOP;

END $$;
