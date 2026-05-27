--
-- V11__refresh_tokens.sql
--
-- Stores hashed refresh tokens so refresh-token rotation can be enforced.
--

CREATE TABLE refresh_tokens (
    id          BIGSERIAL       PRIMARY KEY,
    user_id     BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64)     NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ     NOT NULL,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    revoked_at  TIMESTAMPTZ,
    rotated_at  TIMESTAMPTZ
);

COMMENT ON TABLE refresh_tokens IS 'Hashed JWT refresh tokens used to enforce token rotation and revocation.';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'SHA-256 hash of the raw refresh token; raw bearer tokens are never stored.';

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);
