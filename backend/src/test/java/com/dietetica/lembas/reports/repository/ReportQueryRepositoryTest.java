package com.dietetica.lembas.reports.repository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/** PostgreSQL integration coverage for the native and JPQL report aggregations. */
@DataJpaTest
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(ReportQueryRepository.class)
class ReportQueryRepositoryTest {

    @Container
    @ServiceConnection
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(
            DockerImageName.parse("postgres:16-alpine")
    );

    @Autowired
    private ReportQueryRepository repository;

    @Test
    void salesBreakdownsReconcileWithNetRevenue() {
        LocalDate from = LocalDate.of(2026, 1, 1);
        LocalDate to = LocalDate.of(2026, 12, 31);
        var start = ReportQueryRepository.startOfDayUtc(from);
        var end = ReportQueryRepository.endOfDayUtc(to);

        BigDecimal revenue = repository.totalAndAverageRevenue(start, end, null)[0];
        BigDecimal categoryRevenue = repository.salesByCategory(start, end, null).stream()
                .map(row -> new BigDecimal(row[2].toString()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(categoryRevenue).isEqualByComparingTo(revenue);
        assertThat(repository.costOfGoodsSold(start, end, null)).isGreaterThanOrEqualTo(BigDecimal.ZERO);
        assertThat(repository.salesByDay(from, to, null)).isNotNull();
        assertThat(repository.topProducts(start, end, null, 10)).isNotNull();
    }

    @Test
    void operationalQueriesExecuteAgainstPostgres() {
        LocalDate from = LocalDate.of(2026, 1, 1);
        LocalDate to = LocalDate.of(2026, 12, 31);
        var start = ReportQueryRepository.startOfDayUtc(from);
        var end = ReportQueryRepository.endOfDayUtc(to);

        assertThat(repository.salesByHour(LocalDate.of(2026, 6, 15), null)).hasSize(24);
        assertThat(repository.lowStockProducts(null)).isNotNull();
        assertThat(repository.expiringLotsByMonth(6, null)).hasSize(6);
        assertThat(repository.expiringStockValue(30, null)).isNotNull();
        assertThat(repository.countExpiredLots(null)).isGreaterThanOrEqualTo(0);
        assertThat(repository.purchasesByMonth(start, end, null)).isNotEmpty();
        assertThat(repository.topSuppliersByVolume(start, end, null, 10)).isNotNull();
        assertThat(repository.avgLeadTimeBySupplier(start, end, null, 10)).isNotNull();
        assertThat(repository.purchaseAggregates(start, end, null)).hasSize(4);
        assertThat(repository.employeePosPerformance(start, end, null)).isNotNull();
        assertThat(repository.employeeCashOpenPerformance(start, end, null)).isNotNull();
        assertThat(repository.employeeCashClosePerformance(start, end, null)).isNotNull();
    }

    @Test
    void reportDayBoundariesUseArgentinaTimezone() {
        assertThat(ReportQueryRepository.startOfDayUtc(LocalDate.of(2026, 7, 14)).getOffset())
                .hasToString("-03:00");
    }
}
