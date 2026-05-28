package com.dietetica.lembas;

import com.dietetica.lembas.auth.repository.RefreshTokenRepository;
import com.dietetica.lembas.catalog.repository.CategoryRepository;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.users.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

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
     * Provides a repository collaborator while this smoke test intentionally avoids database startup.
     */
    @MockitoBean
    private UserRepository userRepository;

    /**
     * Provides a refresh token repository collaborator while JPA repositories are disabled.
     */
    @MockitoBean
    private RefreshTokenRepository refreshTokenRepository;

    /**
     * Provides a branch repository collaborator while JPA repositories are disabled.
     */
    @MockitoBean
    private BranchRepository branchRepository;

    /**
     * Provides a category repository collaborator while JPA repositories are disabled.
     */
    @MockitoBean
    private CategoryRepository categoryRepository;

    /**
     * Keeps a fast smoke test for the application context without external services.
     */
    @Test
    void contextLoads() {
    }
}
