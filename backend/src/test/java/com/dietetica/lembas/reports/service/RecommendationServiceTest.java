package com.dietetica.lembas.reports.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.reports.dto.RecommendationDto;
import com.dietetica.lembas.reports.repository.ReportQueryRepository;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Unit tests for {@link RecommendationService}.
 *
 * <p>Stubs the {@link ReportQueryRepository} with controlled row sets and
 * asserts the resulting DTOs (urgency tiers, dedup, type/minUrgency/limit
 * filters).</p>
 */
@ExtendWith(MockitoExtension.class)
class RecommendationServiceTest {

    @Mock
    private ReportQueryRepository reportRepository;

    @Mock
    private SecurityContextHelper securityContextHelper;

    @Mock
    private BranchRepository branchRepository;

    @InjectMocks
    private RecommendationService recommendationService;

    private User admin;
    private User manager;

    @BeforeEach
    void setUp() {
        admin = new User(null, "admin@lembas.com", "hash", "Admin", "User", null, Role.ADMIN);
        manager = new User(7L, "manager@lembas.com", "hash", "Manager", "User", null, Role.MANAGER);
    }

    // ---------------------------------------------------------------------------
    // LOW_STOCK rule
    // ---------------------------------------------------------------------------

    @Test
    void lowStockRuleReturnsHighWhenStockIsZero() {
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(reportRepository.lowStockCandidates(null))
                .thenReturn(List.<Object[]>of(lowStockRow(1L, "Granola", 10, BigDecimal.ZERO)));

        List<RecommendationDto> recs = recommendationService.getRecommendations(null, null, "LOW_STOCK", null, null);

        assertThat(recs).hasSize(1);
        assertThat(recs.get(0).urgency()).isEqualTo("HIGH");
        assertThat(recs.get(0).type()).isEqualTo("LOW_STOCK");
    }

    @Test
    void lowStockRuleReturnsMediumWhenStockBelowHalf() {
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(reportRepository.lowStockCandidates(null))
                .thenReturn(List.<Object[]>of(lowStockRow(1L, "Granola", 10, new BigDecimal("3"))));

        List<RecommendationDto> recs = recommendationService.getRecommendations(null, null, "LOW_STOCK", null, null);

        assertThat(recs).hasSize(1);
        assertThat(recs.get(0).urgency()).isEqualTo("MEDIUM");
    }

    @Test
    void lowStockRuleReturnsLowWhenStockAboveHalf() {
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(reportRepository.lowStockCandidates(null))
                .thenReturn(List.<Object[]>of(lowStockRow(1L, "Granola", 10, new BigDecimal("7"))));

        List<RecommendationDto> recs = recommendationService.getRecommendations(null, null, "LOW_STOCK", null, null);

        assertThat(recs).hasSize(1);
        assertThat(recs.get(0).urgency()).isEqualTo("LOW");
    }

    // ---------------------------------------------------------------------------
    // EXPIRING_SOON rule
    // ---------------------------------------------------------------------------

    @Test
    void expiringSoonRuleReturnsHighWhenExpiringIn7Days() {
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(reportRepository.expiringLotCandidates(30, null))
                .thenReturn(List.<Object[]>of(
                        expiringRow(1L, 99L, "L-1", LocalDate.now().plusDays(5), "10")));

        List<RecommendationDto> recs =
                recommendationService.getRecommendations(null, null, "EXPIRING_SOON", null, null);

        assertThat(recs).hasSize(1);
        assertThat(recs.get(0).urgency()).isEqualTo("HIGH");
    }

    @Test
    void expiringSoonRuleReturnsMediumWhenExpiringInTwoWeeks() {
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(reportRepository.expiringLotCandidates(30, null))
                .thenReturn(List.<Object[]>of(
                        expiringRow(1L, 99L, "L-1", LocalDate.now().plusDays(10), "10")));

        List<RecommendationDto> recs =
                recommendationService.getRecommendations(null, null, "EXPIRING_SOON", null, null);

        assertThat(recs).hasSize(1);
        assertThat(recs.get(0).urgency()).isEqualTo("MEDIUM");
    }

    @Test
    void expiringSoonRuleReturnsLowWhenExpiringInThreeWeeks() {
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(reportRepository.expiringLotCandidates(30, null))
                .thenReturn(List.<Object[]>of(
                        expiringRow(1L, 99L, "L-1", LocalDate.now().plusDays(20), "10")));

        List<RecommendationDto> recs =
                recommendationService.getRecommendations(null, null, "EXPIRING_SOON", null, null);

        assertThat(recs).hasSize(1);
        assertThat(recs.get(0).urgency()).isEqualTo("LOW");
    }

    // ---------------------------------------------------------------------------
    // HIGH_ROTATION rule
    // ---------------------------------------------------------------------------

    @Test
    void highRotationRuleReturnsHighForTopSeller() {
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(reportRepository.highRotationCandidates(any(), any(OffsetDateTime.class)))
                .thenReturn(List.<Object[]>of(highRotationRow(1L, "Granola", 60)));

        List<RecommendationDto> recs =
                recommendationService.getRecommendations(null, null, "HIGH_ROTATION", null, null);

        assertThat(recs).hasSize(1);
        assertThat(recs.get(0).urgency()).isEqualTo("HIGH");
    }

    @Test
    void highRotationRuleReturnsLowForModestVolume() {
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(reportRepository.highRotationCandidates(any(), any(OffsetDateTime.class)))
                .thenReturn(List.<Object[]>of(highRotationRow(1L, "Granola", 12)));

        List<RecommendationDto> recs =
                recommendationService.getRecommendations(null, null, "HIGH_ROTATION", null, null);

        assertThat(recs).hasSize(1);
        assertThat(recs.get(0).urgency()).isEqualTo("LOW");
    }

    // ---------------------------------------------------------------------------
    // NO_MOVEMENT rule
    // ---------------------------------------------------------------------------

    @Test
    void noMovementRuleReturnsHighWhenNoSalesAreRecorded() {
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(reportRepository.noMovementCandidates(any(), any()))
                .thenReturn(List.<Object[]>of(noMovementRow(1L, "Granola", "10", null)));

        List<RecommendationDto> recs = recommendationService.getRecommendations(null, null, "NO_MOVEMENT", null, null);

        assertThat(recs).hasSize(1);
        assertThat(recs.get(0).daysWithoutSales()).isNull();
        assertThat(recs.get(0).urgency()).isEqualTo("HIGH");
    }

    @Test
    void noMovementRuleReturnsHighAtNinetyDaysWithoutSales() {
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(reportRepository.noMovementCandidates(any(), any()))
                .thenReturn(List.<Object[]>of(noMovementRow(1L, "Granola", "10", daysAgo(90))));

        List<RecommendationDto> recs = recommendationService.getRecommendations(null, null, "NO_MOVEMENT", null, null);

        assertThat(recs).hasSize(1);
        assertThat(recs.get(0).urgency()).isEqualTo("HIGH");
    }

    @Test
    void noMovementRuleReturnsMediumBetweenSixtyAndEightyNineDaysWithoutSales() {
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(reportRepository.noMovementCandidates(any(), any()))
                .thenReturn(List.<Object[]>of(noMovementRow(1L, "Granola", "10", daysAgo(60))));

        List<RecommendationDto> recs = recommendationService.getRecommendations(null, null, "NO_MOVEMENT", null, null);

        assertThat(recs).hasSize(1);
        assertThat(recs.get(0).urgency()).isEqualTo("MEDIUM");
    }

    @Test
    void noMovementRuleReturnsLowBetweenThirtyAndFiftyNineDaysWithoutSales() {
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(reportRepository.noMovementCandidates(any(), any()))
                .thenReturn(List.<Object[]>of(noMovementRow(1L, "Granola", "10", daysAgo(30))));

        List<RecommendationDto> recs = recommendationService.getRecommendations(null, null, "NO_MOVEMENT", null, null);

        assertThat(recs).hasSize(1);
        assertThat(recs.get(0).urgency()).isEqualTo("LOW");
    }

    @Test
    void noMovementRuleSkipsProductsBelowTheLookbackWindow() {
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(reportRepository.noMovementCandidates(any(), any()))
                .thenReturn(List.<Object[]>of(noMovementRow(1L, "Granola", "10", daysAgo(29))));

        List<RecommendationDto> recs = recommendationService.getRecommendations(null, null, "NO_MOVEMENT", null, null);

        assertThat(recs).isEmpty();
    }

    // ---------------------------------------------------------------------------
    // Filters
    // ---------------------------------------------------------------------------

    @Test
    void minUrgencyFilterDropsLowWhenAskingHigh() {
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(reportRepository.lowStockCandidates(null))
                .thenReturn(List.<Object[]>of(
                        lowStockRow(1L, "Granola A", 10, new BigDecimal("8")),
                        lowStockRow(2L, "Granola B", 10, BigDecimal.ZERO)));

        List<RecommendationDto> recs = recommendationService.getRecommendations(null, "HIGH", "LOW_STOCK", null, null);

        assertThat(recs).hasSize(1);
        assertThat(recs.get(0).productName()).isEqualTo("Granola B");
    }

    @Test
    void limitTrimsResult() {
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(reportRepository.lowStockCandidates(null))
                .thenReturn(List.<Object[]>of(
                        lowStockRow(1L, "A", 10, BigDecimal.ZERO),
                        lowStockRow(2L, "B", 10, BigDecimal.ZERO),
                        lowStockRow(3L, "C", 10, BigDecimal.ZERO)));

        List<RecommendationDto> recs = recommendationService.getRecommendations(null, null, "LOW_STOCK", null, 2);

        assertThat(recs).hasSize(2);
    }

    @Test
    void deduplicatesIdenticalEntries() {
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(reportRepository.lowStockCandidates(null))
                .thenReturn(List.<Object[]>of(
                        lowStockRow(1L, "Granola", 10, BigDecimal.ZERO),
                        lowStockRow(1L, "Granola", 10, BigDecimal.ZERO)));

        List<RecommendationDto> recs = recommendationService.getRecommendations(null, null, "LOW_STOCK", null, null);

        assertThat(recs).hasSize(1);
    }

    @Test
    void sortByUrgencyPutsHighFirst() {
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(reportRepository.lowStockCandidates(null))
                .thenReturn(List.<Object[]>of(
                        lowStockRow(1L, "LowProduct", 10, new BigDecimal("7")),
                        lowStockRow(2L, "HighProduct", 10, BigDecimal.ZERO)));

        List<RecommendationDto> recs = recommendationService.getRecommendations(null, null, "LOW_STOCK", null, null);

        assertThat(recs).extracting(RecommendationDto::urgency).containsExactly("HIGH", "LOW");
    }

    // ---------------------------------------------------------------------------
    // Validation
    // ---------------------------------------------------------------------------

    @Test
    void invalidMinUrgencyRejected() {
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);

        assertThatThrownBy(() -> recommendationService.getRecommendations(null, "GIGA", null, null, null))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> assertThat(((DomainException) ex).getCode()).isEqualTo("INVALID_URGENCY"));
    }

    @Test
    void invalidTypeRejected() {
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);

        assertThatThrownBy(() -> recommendationService.getRecommendations(null, null, "NOPE", null, null))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> assertThat(((DomainException) ex).getCode()).isEqualTo("INVALID_TYPE"));
    }

    @Test
    void rejectsCustomer() {
        User customer = new User(null, "c@lembas.com", "hash", "C", "C", null, Role.CUSTOMER);
        when(securityContextHelper.getCurrentUser()).thenReturn(customer);

        assertThatThrownBy(() -> recommendationService.getRecommendations(null, null, null, null, null))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> assertThat(((DomainException) ex).getCode()).isEqualTo("ACCESS_DENIED"));
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    private static Object[] lowStockRow(Long productId, String name, int minimum, BigDecimal stock) {
        return new Object[] {
            productId, name, 1L, "Categoria", "12345", minimum, stock,
        };
    }

    private static Object[] expiringRow(
            Long lotId, Long productId, String lotCode, LocalDate expirationDate, String quantity) {
        return new Object[] {
            lotId,
            productId,
            "Producto " + productId,
            1L,
            "Categoria",
            lotCode,
            expirationDate,
            new BigDecimal(quantity),
        };
    }

    private static Object[] highRotationRow(Long productId, String name, int totalSold) {
        return new Object[] {
            productId, name, 1L, "Categoria", totalSold,
        };
    }

    private static Object[] noMovementRow(Long productId, String name, String stock, OffsetDateTime lastSale) {
        return new Object[] {
            productId, name, 1L, "Categoria", "12345", new BigDecimal(stock), lastSale,
        };
    }

    private static OffsetDateTime daysAgo(int days) {
        ZoneId reportZone = ZoneId.of("America/Argentina/Buenos_Aires");
        return LocalDate.now(reportZone)
                .minusDays(days)
                .atStartOfDay(reportZone)
                .toOffsetDateTime();
    }
}
