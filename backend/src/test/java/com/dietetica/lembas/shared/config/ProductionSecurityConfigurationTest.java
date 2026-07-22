package com.dietetica.lembas.shared.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

/**
 * Verifies that invalid production deployment settings prevent application startup.
 */
class ProductionSecurityConfigurationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withInitializer(context -> context.getEnvironment().setActiveProfiles("prod"))
            .withUserConfiguration(ProductionSecurityConfiguration.class)
            .withPropertyValues(validProductionProperties());

    @Test
    void Should_start_when_allProductionSecuritySettingsAreExplicitAndSafe() {
        contextRunner.run(context -> {
            assertThat(context.getStartupFailure()).isNull();
            assertThat(context).hasSingleBean(ProductionSecurityConfiguration.ProductionSecurityValidator.class);
        });
    }

    @Test
    void Should_rejectMissingOrPlaceholderProductionSecrets() {
        contextRunner
                .withPropertyValues("app.security.jwt-secret=change-me-before-production")
                .run(context -> assertThat(context.getStartupFailure())
                        .hasMessageContaining("app.security.jwt-secret must contain a production secret"));

        contextRunner.withPropertyValues("app.security.jwt-secret=").run(context -> assertThat(
                        context.getStartupFailure())
                .hasMessageContaining("app.security.jwt-secret must be set"));

        contextRunner
                .withPropertyValues("app.mercado-pago.access-token=dev-fake-token")
                .run(context -> assertThat(context.getStartupFailure())
                        .hasMessageContaining("app.mercado-pago.access-token must contain a production secret"));

        contextRunner.withPropertyValues("app.mercado-pago.webhook-secret=").run(context -> assertThat(
                        context.getStartupFailure())
                .hasMessageContaining("app.mercado-pago.webhook-secret must be set"));
    }

    @Test
    void Should_rejectMissingDatabaseCredentialsAndNonHttpsProviderUrls() {
        contextRunner.withPropertyValues("spring.datasource.username=").run(context -> assertThat(
                        context.getStartupFailure())
                .hasMessageContaining("spring.datasource.username must be set"));

        contextRunner.withPropertyValues("spring.datasource.password=").run(context -> assertThat(
                        context.getStartupFailure())
                .hasMessageContaining("spring.datasource.password must be set"));

        contextRunner
                .withPropertyValues("spring.datasource.password=change-me-database-password")
                .run(context -> assertThat(context.getStartupFailure())
                        .hasMessageContaining("spring.datasource.password must contain a production secret"));

        contextRunner
                .withPropertyValues("app.mercado-pago.notification-url=http://localhost:8080/api/webhooks/mercadopago")
                .run(context -> assertThat(context.getStartupFailure())
                        .hasMessageContaining("app.mercado-pago.notification-url must be a public HTTPS URL"));
    }

    @Test
    void Should_rejectMissingWildcardOrNonHttpsProductionOrigins() {
        contextRunner.withPropertyValues("app.security.allowed-origins=").run(context -> assertThat(
                        context.getStartupFailure())
                .hasMessageContaining("app.security.allowed-origins must explicitly list production origins"));

        contextRunner.withPropertyValues("app.security.allowed-origins=*").run(context -> assertThat(
                        context.getStartupFailure())
                .hasMessageContaining("app.security.allowed-origins must contain explicit HTTPS origins"));

        contextRunner
                .withPropertyValues("app.security.allowed-origins=https://*.example.test")
                .run(context -> assertThat(context.getStartupFailure())
                        .hasMessageContaining("app.security.allowed-origins must contain explicit HTTPS origins"));

        contextRunner
                .withPropertyValues("app.security.allowed-origins=http://store.example.test")
                .run(context -> assertThat(context.getStartupFailure())
                        .hasMessageContaining("app.security.allowed-origins must contain explicit HTTPS origins"));

        contextRunner
                .withPropertyValues("app.security.allowed-origins=https://localhost")
                .run(context -> assertThat(context.getStartupFailure())
                        .hasMessageContaining("app.security.allowed-origins must contain explicit HTTPS origins"));
    }

    @Test
    void Should_rejectPrivateOrMalformedProviderCallbacks() {
        contextRunner
                .withPropertyValues("app.mercado-pago.success-url=https://localhost/payment/callback")
                .run(context -> assertThat(context.getStartupFailure())
                        .hasMessageContaining("app.mercado-pago.success-url must be a public HTTPS URL"));

        contextRunner
                .withPropertyValues("app.mercado-pago.notification-url=https://provider.example.test/webhook#fragment")
                .run(context -> assertThat(context.getStartupFailure())
                        .hasMessageContaining("app.mercado-pago.notification-url must be a public HTTPS URL"));
    }

    private static String[] validProductionProperties() {
        return new String[] {
            "app.security.jwt-secret=production-jwt-secret-value-with-32-characters",
            "app.security.allowed-origins=https://store.example.test",
            "spring.datasource.username=lembas_application",
            "spring.datasource.password=database-password-for-production-only",
            "app.mercado-pago.access-token=production-mercado-pago-access-token-value",
            "app.mercado-pago.webhook-secret=production-mercado-pago-webhook-secret-value",
            "app.mercado-pago.success-url=https://store.example.test/customer/payment/callback",
            "app.mercado-pago.failure-url=https://store.example.test/customer/payment/callback",
            "app.mercado-pago.pending-url=https://store.example.test/customer/payment/callback",
            "app.mercado-pago.notification-url=https://api.example.test/api/webhooks/mercadopago"
        };
    }
}
