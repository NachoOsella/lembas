--
-- V10__seed_data.sql
--
-- Seed data for local development (Sprint 1, S1-US03).
-- This is a partial seed: a branch, an admin demo user, and base categories.
--
-- Subtask:
--    LEMBAS-77: Crear V10__seed_data.sql parcial con sucursal Centro,
--               admin demo y categorias base
--

-- =============================================================================
-- Branch
-- =============================================================================
INSERT INTO branches (name, address, phone, active)
VALUES (
    'Centro',
    'Av. Siempre Viva 123, Cordoba',
    '+54 351 555-0001',
    true
);

-- =============================================================================
-- Admin demo user
--   email:    admin@lembas.com
--   password: admin123 (BCrypt hash, cost 10)
-- =============================================================================
INSERT INTO users (branch_id, email, password_hash, first_name, last_name, role, enabled)
VALUES (
    (SELECT id FROM branches WHERE name = 'Centro'),
    'admin@lembas.com',
    '$2a$10$4/FkImI6zRwqfW4s7Plg9.mW2ELmk2iqvl2NTRD21V4gi75ltxPXG',
    'Admin',
    'Lembas',
    'ADMIN',
    true
);

-- =============================================================================
-- Base categories
-- =============================================================================
INSERT INTO categories (name, description) VALUES
    ('Suplementos', 'Vitaminas, proteinas, y suplementos deportivos'),
    ('Hierbas', 'Hierbas medicinales y te'),
    ('Alimentos Naturales', 'Alimentos organicos y naturales'),
    ('Cosmetica Natural', 'Productos de cuidado personal naturales'),
    ('Aceites Esenciales', 'Aceites esenciales y aromaterapia');
