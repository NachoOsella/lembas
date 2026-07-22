package com.dietetica.lembas.shared.config;

import static org.assertj.core.api.Assertions.assertThat;

import io.swagger.v3.oas.models.OpenAPI;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

/**
 * Ensures generated API documentation is unavailable in production contexts.
 */
class OpenApiConfigTest {

    @Test
    void Should_createOpenApiMetadataOutsideProduction() {
        new ApplicationContextRunner()
                .withUserConfiguration(OpenApiConfig.class)
                .run(context -> assertThat(context).hasSingleBean(OpenAPI.class));
    }

    @Test
    void Should_notCreateOpenApiMetadataInProduction() {
        new ApplicationContextRunner()
                .withInitializer(context -> context.getEnvironment().setActiveProfiles("prod"))
                .withUserConfiguration(OpenApiConfig.class)
                .run(context -> assertThat(context).doesNotHaveBean(OpenAPI.class));
    }
}
