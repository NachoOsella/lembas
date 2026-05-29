package com.dietetica.lembas.catalog.model;

/** Catalog visibility states available for online-store publishing workflows. */
public enum ProductOnlineStatus {
    DRAFT,
    PUBLISHED,
    PAUSED,
    HIDDEN;

    /**
     * Returns {@code true} when this status can transition to the given target.
     *
     * <p>Allowed transitions:
     * <ul>
     *   <li>{@code DRAFT -> PUBLISHED}</li>
     *   <li>{@code PUBLISHED -> PAUSED}</li>
     *   <li>{@code PAUSED -> PUBLISHED}</li>
     *   <li>{@code PAUSED -> HIDDEN}</li>
     *   <li>{@code HIDDEN -> PAUSED}</li>
     * </ul>
     */
    public boolean canTransitionTo(ProductOnlineStatus target) {
        if (target == null || target == this) {
            return false;
        }

        return switch (this) {
            case DRAFT -> target == PUBLISHED;
            case PUBLISHED -> target == PAUSED;
            case PAUSED -> target == PUBLISHED || target == HIDDEN;
            case HIDDEN -> target == PAUSED;
        };
    }
}
