package com.dietetica.lembas.shared.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Browser-facing security settings shared by cookie and origin policies.
 */
@ConfigurationProperties(prefix = "app.security")
public record SecurityPolicyProperties(List<String> allowedOrigins, boolean forceSecureCookies) {

    /** Ensures consumers can safely iterate over the configured origins. */
    public SecurityPolicyProperties {
        allowedOrigins = allowedOrigins == null ? List.of() : List.copyOf(allowedOrigins);
    }
}
