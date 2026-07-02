/**
 * Read-only public content for the online store (terms and FAQ).
 *
 * <p>Backed by an in-memory {@code LegalContentService} for now so the
 * content can be versioned with the application. The service exposes a
 * small DTO surface that can be replaced by a database-backed provider
 * later without changing the public endpoints.</p>
 */
package com.dietetica.lembas.content;
