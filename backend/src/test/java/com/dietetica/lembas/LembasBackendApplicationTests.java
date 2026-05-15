package com.dietetica.lembas;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Verifies that the application context can start without external services.
 */
@SpringBootTest(classes = LembasBackendApplication.class, properties = {
        "spring.autoconfigure.exclude="
                + "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration"
})
class LembasBackendApplicationTests {

    /**
     * Keeps a fast smoke test for the empty scaffold.
     */
    @Test
    void contextLoads() {
    }
}
