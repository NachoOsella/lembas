package com.dietetica.lembas.shared.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configures OpenAPI metadata for generated API documentation.
 */
@Configuration
public class OpenApiConfig {

    /**
     * Provides the base API title and version shown in Swagger UI.
     */
    @Bean
    public OpenAPI lembasOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Dietetica Lembas API")
                        .version("0.0.1-SNAPSHOT")
                        .description("Integrated commercial management and e-commerce API."));
    }
}
