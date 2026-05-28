package com.dietetica.lembas.shared.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configures OpenAPI metadata for generated API documentation.
 */
@Configuration
public class OpenApiConfig {

    private static final String BEARER_AUTH_SCHEME = "bearerAuth";

    /**
     * Provides the base API title, version, and JWT bearer authentication scheme
     * shown in Swagger UI.
     */
    @Bean
    public OpenAPI lembasOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Dietetica Lembas API")
                        .version("0.0.1-SNAPSHOT")
                        .description("Integrated commercial management and e-commerce API."))
                .components(new Components()
                        .addSecuritySchemes(BEARER_AUTH_SCHEME, new SecurityScheme()
                                .name(BEARER_AUTH_SCHEME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
