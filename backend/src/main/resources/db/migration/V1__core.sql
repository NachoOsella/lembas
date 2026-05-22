--
-- V1__core.sql
--
-- Core tables: branches and users (Sprint 1, S1-US03).
--
-- Subtasks:
--    LEMBAS-73: Crear V1__core.sql con branches y users
--    LEMBAS-75: Agregar CHECK para role ADMIN/MANAGER/EMPLOYEE/CUSTOMER
--

-- =============================================================================
-- Branches
-- =============================================================================
CREATE TABLE branches (
    id          BIGSERIAL       PRIMARY KEY,
    name        VARCHAR(255)    NOT NULL,
    address     VARCHAR(255),
    phone       VARCHAR(50),
    active      BOOLEAN         DEFAULT true,
    created_at  TIMESTAMPTZ     DEFAULT now()
);

COMMENT ON TABLE branches IS 'Physical points of sale / branches. Stock and orders are associated to a branch.';

-- =============================================================================
-- Users
-- =============================================================================
CREATE TABLE users (
    id              BIGSERIAL       PRIMARY KEY,
    branch_id       BIGINT          REFERENCES branches(id),
    email           VARCHAR(255)    UNIQUE NOT NULL,
    password_hash   VARCHAR(255)    NOT NULL,
    first_name      VARCHAR(100)    NOT NULL,
    last_name       VARCHAR(100)    NOT NULL,
    phone           VARCHAR(50),
    role            VARCHAR(20)     NOT NULL,
    enabled         BOOLEAN         DEFAULT true,
    created_at      TIMESTAMPTZ     DEFAULT now(),
    updated_at      TIMESTAMPTZ     DEFAULT now(),

    CONSTRAINT chk_user_role
        CHECK (role IN ('ADMIN', 'MANAGER', 'EMPLOYEE', 'CUSTOMER'))
);

COMMENT ON TABLE users IS 'System users: employees, managers, admins, and customers.';

COMMENT ON COLUMN users.role IS 'Allowed: ADMIN, MANAGER, EMPLOYEE, CUSTOMER.';

-- Index for login lookups and branch scoping
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_branch_id ON users (branch_id);
