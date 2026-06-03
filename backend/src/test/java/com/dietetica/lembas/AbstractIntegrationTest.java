package com.dietetica.lembas;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Base class for full application integration tests backed by PostgreSQL.
 *
 * <p>The shared Testcontainers setup keeps integration tests consistent with
 * the Flyway-managed schema used by the application while avoiding duplicated
 * container declarations in each test class.</p>
 */
@SpringBootTest(classes = LembasBackendApplication.class)
@Testcontainers
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
public abstract class AbstractIntegrationTest {

    /** PostgreSQL container shared by integration test subclasses. */
    @Container
    @ServiceConnection
    @SuppressWarnings("rawtypes")
    protected static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(
            DockerImageName.parse("postgres:16-alpine")
    );
}
