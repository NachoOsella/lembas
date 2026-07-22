package com.dietetica.lembas.shared.config;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.util.StringUtils;

/**
 * Validates security-critical deployment settings before a production context starts.
 */
@Configuration(proxyBeanMethods = false)
@Profile("prod")
public class ProductionSecurityConfiguration {

    @Bean
    ProductionSecurityValidator productionSecurityValidator(
            @Value("${app.security.jwt-secret:}") String jwtSecret,
            @Value("${app.security.allowed-origins:}") String allowedOrigins,
            @Value("${spring.datasource.username:}") String databaseUsername,
            @Value("${spring.datasource.password:}") String databasePassword,
            @Value("${app.mercado-pago.access-token:}") String mercadoPagoAccessToken,
            @Value("${app.mercado-pago.webhook-secret:}") String mercadoPagoWebhookSecret,
            @Value("${app.mercado-pago.success-url:}") String successUrl,
            @Value("${app.mercado-pago.failure-url:}") String failureUrl,
            @Value("${app.mercado-pago.pending-url:}") String pendingUrl,
            @Value("${app.mercado-pago.notification-url:}") String notificationUrl) {
        return new ProductionSecurityValidator(
                jwtSecret,
                allowedOrigins,
                databaseUsername,
                databasePassword,
                mercadoPagoAccessToken,
                mercadoPagoWebhookSecret,
                successUrl,
                failureUrl,
                pendingUrl,
                notificationUrl);
    }

    /**
     * Performs the validation during bean construction so invalid production configuration fails startup.
     */
    static final class ProductionSecurityValidator {

        ProductionSecurityValidator(
                String jwtSecret,
                String allowedOrigins,
                String databaseUsername,
                String databasePassword,
                String mercadoPagoAccessToken,
                String mercadoPagoWebhookSecret,
                String successUrl,
                String failureUrl,
                String pendingUrl,
                String notificationUrl) {
            requireProductionSecret(jwtSecret, "app.security.jwt-secret");
            requireNonBlank(databaseUsername, "spring.datasource.username");
            requireProductionSecret(databasePassword, "spring.datasource.password");
            requireProductionSecret(mercadoPagoAccessToken, "app.mercado-pago.access-token");
            requireProductionSecret(mercadoPagoWebhookSecret, "app.mercado-pago.webhook-secret");
            requireAllowedOrigins(allowedOrigins);
            requirePublicHttpsUrl(successUrl, "app.mercado-pago.success-url");
            requirePublicHttpsUrl(failureUrl, "app.mercado-pago.failure-url");
            requirePublicHttpsUrl(pendingUrl, "app.mercado-pago.pending-url");
            requirePublicHttpsUrl(notificationUrl, "app.mercado-pago.notification-url");
        }

        private static void requireProductionSecret(String value, String propertyName) {
            requireNonBlank(value, propertyName);
            String normalized = value.trim().toLowerCase(Locale.ROOT);
            if (normalized.length() < 32
                    || normalized.contains("change-me")
                    || normalized.contains("placeholder")
                    || normalized.contains("your-secret")
                    || normalized.contains("dev-fake")
                    || normalized.startsWith("test-")) {
                throw new IllegalStateException(propertyName + " must contain a production secret");
            }
        }

        private static void requireNonBlank(String value, String propertyName) {
            if (!StringUtils.hasText(value)) {
                throw new IllegalStateException(propertyName + " must be set");
            }
        }

        private static void requireAllowedOrigins(String configuredOrigins) {
            if (!StringUtils.hasText(configuredOrigins)) {
                throw new IllegalStateException("app.security.allowed-origins must explicitly list production origins");
            }
            List<String> origins = Arrays.stream(configuredOrigins.split(","))
                    .map(String::trim)
                    .filter(StringUtils::hasText)
                    .toList();
            if (origins.isEmpty()) {
                throw new IllegalStateException("app.security.allowed-origins must explicitly list production origins");
            }
            for (String origin : origins) {
                if (!isPublicHttpsOrigin(origin)) {
                    throw new IllegalStateException("app.security.allowed-origins must contain explicit HTTPS origins");
                }
            }
        }

        private static boolean isPublicHttpsOrigin(String value) {
            try {
                URI uri = new URI(value);
                return isPublicHttpsUri(uri)
                        && uri.getRawPath().isEmpty()
                        && uri.getRawQuery() == null
                        && uri.getRawFragment() == null;
            } catch (URISyntaxException exception) {
                return false;
            }
        }

        private static void requirePublicHttpsUrl(String value, String propertyName) {
            requireNonBlank(value, propertyName);
            try {
                URI uri = new URI(value);
                if (!isPublicHttpsUri(uri) || uri.getRawFragment() != null) {
                    throw new IllegalStateException(propertyName + " must be a public HTTPS URL");
                }
            } catch (URISyntaxException exception) {
                throw new IllegalStateException(propertyName + " must be a public HTTPS URL");
            }
        }

        private static boolean isPublicHttpsUri(URI uri) {
            return "https".equalsIgnoreCase(uri.getScheme())
                    && StringUtils.hasText(uri.getHost())
                    && uri.getRawUserInfo() == null
                    && !isLocalOrIpAddress(uri.getHost());
        }

        private static boolean isLocalOrIpAddress(String host) {
            String normalizedHost = host.toLowerCase(Locale.ROOT);
            return normalizedHost.equals("localhost")
                    || normalizedHost.endsWith(".localhost")
                    || normalizedHost.contains(":")
                    || normalizedHost.matches("\\d{1,3}(?:\\.\\d{1,3}){3}");
        }
    }
}
