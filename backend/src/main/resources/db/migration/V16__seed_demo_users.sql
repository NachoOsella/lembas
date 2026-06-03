--
-- V16__seed_demo_users.sql
--
-- Completes local demo credentials for Sprint 1 testing flows.
-- These users are non-production accounts intended only for local development.
--

-- =============================================================================
-- Demo internal employee
--   email:    empleado@lembas.com
--   password: admin123 (BCrypt hash, cost 10)
-- =============================================================================
INSERT INTO users (branch_id, email, password_hash, first_name, last_name, role, enabled)
VALUES (
    (SELECT id FROM branches WHERE name = 'Centro'),
    'empleado@lembas.com',
    '$2a$10$4/FkImI6zRwqfW4s7Plg9.mW2ELmk2iqvl2NTRD21V4gi75ltxPXG',
    'Empleado',
    'Demo',
    'EMPLOYEE',
    true
)
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- Demo customer
--   email:    customer@lembas.com
--   password: admin123 (BCrypt hash, cost 10)
-- =============================================================================
INSERT INTO users (branch_id, email, password_hash, first_name, last_name, phone, role, enabled)
VALUES (
    NULL,
    'customer@lembas.com',
    '$2a$10$4/FkImI6zRwqfW4s7Plg9.mW2ELmk2iqvl2NTRD21V4gi75ltxPXG',
    'Cliente',
    'Demo',
    '+54 351 555-0100',
    'CUSTOMER',
    true
)
ON CONFLICT (email) DO NOTHING;
