package com.dietetica.lembas.catalog.model;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Tests for the allowed online-status transitions in the publishing workflow. */
class ProductOnlineStatusTest {

    // --- DRAFT transitions ---

    @Test
    void draftCanTransitionToPublished() {
        assertThat(ProductOnlineStatus.DRAFT.canTransitionTo(ProductOnlineStatus.PUBLISHED)).isTrue();
    }

    @Test
    void draftCannotTransitionToPaused() {
        assertThat(ProductOnlineStatus.DRAFT.canTransitionTo(ProductOnlineStatus.PAUSED)).isFalse();
    }

    @Test
    void draftCannotTransitionToHidden() {
        assertThat(ProductOnlineStatus.DRAFT.canTransitionTo(ProductOnlineStatus.HIDDEN)).isFalse();
    }

    // --- PUBLISHED transitions ---

    @Test
    void publishedCanTransitionToPaused() {
        assertThat(ProductOnlineStatus.PUBLISHED.canTransitionTo(ProductOnlineStatus.PAUSED)).isTrue();
    }

    @Test
    void publishedCannotTransitionToDraft() {
        assertThat(ProductOnlineStatus.PUBLISHED.canTransitionTo(ProductOnlineStatus.DRAFT)).isFalse();
    }

    @Test
    void publishedCannotTransitionToHidden() {
        assertThat(ProductOnlineStatus.PUBLISHED.canTransitionTo(ProductOnlineStatus.HIDDEN)).isFalse();
    }

    // --- PAUSED transitions ---

    @Test
    void pausedCanTransitionToPublished() {
        assertThat(ProductOnlineStatus.PAUSED.canTransitionTo(ProductOnlineStatus.PUBLISHED)).isTrue();
    }

    @Test
    void pausedCanTransitionToHidden() {
        assertThat(ProductOnlineStatus.PAUSED.canTransitionTo(ProductOnlineStatus.HIDDEN)).isTrue();
    }

    @Test
    void pausedCannotTransitionToDraft() {
        assertThat(ProductOnlineStatus.PAUSED.canTransitionTo(ProductOnlineStatus.DRAFT)).isFalse();
    }

    // --- HIDDEN transitions ---

    @Test
    void hiddenCanTransitionToPaused() {
        assertThat(ProductOnlineStatus.HIDDEN.canTransitionTo(ProductOnlineStatus.PAUSED)).isTrue();
    }

    @Test
    void hiddenCannotTransitionToPublished() {
        assertThat(ProductOnlineStatus.HIDDEN.canTransitionTo(ProductOnlineStatus.PUBLISHED)).isFalse();
    }

    @Test
    void hiddenCannotTransitionToDraft() {
        assertThat(ProductOnlineStatus.HIDDEN.canTransitionTo(ProductOnlineStatus.DRAFT)).isFalse();
    }

    // --- Self-transition and null ---

    @Test
    void cannotTransitionToSameStatus() {
        assertThat(ProductOnlineStatus.DRAFT.canTransitionTo(ProductOnlineStatus.DRAFT)).isFalse();
        assertThat(ProductOnlineStatus.PUBLISHED.canTransitionTo(ProductOnlineStatus.PUBLISHED)).isFalse();
        assertThat(ProductOnlineStatus.PAUSED.canTransitionTo(ProductOnlineStatus.PAUSED)).isFalse();
        assertThat(ProductOnlineStatus.HIDDEN.canTransitionTo(ProductOnlineStatus.HIDDEN)).isFalse();
    }

    @Test
    void cannotTransitionToNull() {
        assertThat(ProductOnlineStatus.DRAFT.canTransitionTo(null)).isFalse();
    }
}
