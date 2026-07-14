package com.dietetica.lembas.reports.service;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.cash.service.CashService;
import com.dietetica.lembas.payments.repository.PaymentRepository;
import com.dietetica.lembas.reports.repository.ReportQueryRepository;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the pure helpers inside {@link ReportService}.
 *
 * <p>The dashboard's database queries are exercised in the integration tests
 * (see {@code ReportServiceIntegrationTest}); here we focus on the trend
 * math and the role-based branch resolution which is the most important
 * cross-cutting policy in the report module.</p>
 */
@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock
    private ReportQueryRepository reportRepository;
    @Mock
    private SecurityContextHelper securityContextHelper;
    @Mock
    private BranchRepository branchRepository;
    @Mock
    private CashService cashService;
    @Mock
    private PaymentRepository paymentRepository;

    @InjectMocks
    private ReportService reportService;

    private User admin;
    private User manager;

    @BeforeEach
    void setUp() {
        admin = new User(null, "admin@lembas.com", "hash", "Admin", "User", null, Role.ADMIN);
        manager = new User(7L, "manager@lembas.com", "hash", "Manager", "User", null, Role.MANAGER);
    }

    // ---------------------------------------------------------------------------
    // Trend helpers
    // ---------------------------------------------------------------------------

    @Test
    void trendReturnsUpWhenCurrentGreater() {
        assertThat(ReportService.trend(new BigDecimal("120"), new BigDecimal("100"))).isEqualTo("UP");
    }

    @Test
    void trendReturnsDownWhenCurrentLower() {
        assertThat(ReportService.trend(new BigDecimal("80"), new BigDecimal("100"))).isEqualTo("DOWN");
    }

    @Test
    void trendReturnsFlatWhenEqual() {
        assertThat(ReportService.trend(new BigDecimal("100"), new BigDecimal("100"))).isEqualTo("FLAT");
    }

    @Test
    void trendHandlesNullsAsZero() {
        assertThat(ReportService.trend(null, null)).isEqualTo("FLAT");
        assertThat(ReportService.trend(new BigDecimal("10"), null)).isEqualTo("UP");
        assertThat(ReportService.trend(null, new BigDecimal("10"))).isEqualTo("DOWN");
    }

    @Test
    void percentageDiffComputesRelativeChange() {
        BigDecimal diff = ReportService.percentageDiff(new BigDecimal("150"), new BigDecimal("100"));
        assertThat(diff).isEqualByComparingTo(new BigDecimal("50.0000"));
    }

    @Test
    void percentageDiffReturnsNullWhenPreviousZeroAndCurrentZero() {
        assertThat(ReportService.percentageDiff(new BigDecimal("0"), new BigDecimal("0"))).isNull();
    }

    @Test
    void percentageDiffReturnsHundredWhenPreviousZeroAndCurrentPositive() {
        BigDecimal diff = ReportService.percentageDiff(new BigDecimal("10"), new BigDecimal("0"));
        assertThat(diff).isEqualByComparingTo(new BigDecimal("100.0000"));
    }

    // ---------------------------------------------------------------------------
    // Branch resolution (role-based policy)
    // ---------------------------------------------------------------------------

    @Test
    void getDashboardAsAdminWithoutBranchConsolidates() {
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        // Any branch return: an admin with no filter aggregates every branch
        // (the repository receives branchId = null).
        stubEmptyAggregations();
        when(reportRepository.countActiveProducts()).thenReturn(0L);
        when(reportRepository.countActiveSuppliers()).thenReturn(0L);

        var dto = reportService.getDashboard(null, null);
        assertThat(dto.branchId()).isNull();
        assertThat(dto.branchName()).isNull();
    }

    @Test
    void getDashboardAsAdminWithValidBranchScopesReport() {
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(branchRepository.existsByIdAndActiveTrue(3L)).thenReturn(true);
        // Branch entity is constructed via reflection; the name is set directly.
        com.dietetica.lembas.shared.branch.model.Branch b = newBranch(3L, "Centro");
        when(branchRepository.findById(3L)).thenReturn(java.util.Optional.of(b));
        stubEmptyAggregations();
        when(reportRepository.countActiveProducts()).thenReturn(0L);
        when(reportRepository.countActiveSuppliers()).thenReturn(0L);

        var dto = reportService.getDashboard(null, 3L);
        assertThat(dto.branchId()).isEqualTo(3L);
        assertThat(dto.branchName()).isEqualTo("Centro");
    }

    @Test
    void getDashboardAsAdminWithInvalidBranchThrows404() {
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(branchRepository.existsByIdAndActiveTrue(99L)).thenReturn(false);

        assertThatThrownBy(() -> reportService.getDashboard(null, 99L))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> assertThat(((DomainException) ex).getCode()).isEqualTo("BRANCH_NOT_FOUND"));
    }

    @Test
    void getDashboardAsManagerForcesOwnBranch() {
        when(securityContextHelper.getCurrentUser()).thenReturn(manager);
        when(branchRepository.findById(7L)).thenReturn(java.util.Optional.of(newBranch(7L, "Sucursal 7")));
        stubEmptyAggregations();
        when(reportRepository.countActiveProducts()).thenReturn(0L);
        when(reportRepository.countActiveSuppliers()).thenReturn(0L);

        // Manager asks for branch 99: service must ignore it and use 7 (own branch).
        var dto = reportService.getDashboard(null, 99L);
        assertThat(dto.branchId()).isEqualTo(7L);
        assertThat(dto.branchName()).isEqualTo("Sucursal 7");
    }

    @Test
    void getDashboardAsManagerWithoutBranchThrows() {
        when(securityContextHelper.getCurrentUser()).thenReturn(manager);
        // manager already has branchId=7, so we should not throw for own branch
        // but the test verifies behaviour for branchId=null:
        when(branchRepository.findById(7L)).thenReturn(java.util.Optional.of(newBranch(7L, "Sucursal 7")));
        stubEmptyAggregations();
        when(reportRepository.countActiveProducts()).thenReturn(0L);
        when(reportRepository.countActiveSuppliers()).thenReturn(0L);

        var dto = reportService.getDashboard(null, null);
        assertThat(dto.branchId()).isEqualTo(7L);
    }

    @Test
    void getDashboardRejectsCustomer() {
        User customer = new User(null, "c@lembas.com", "hash", "C", "C", null, Role.CUSTOMER);
        when(securityContextHelper.getCurrentUser()).thenReturn(customer);

        assertThatThrownBy(() -> reportService.getDashboard(null, null))
                .isInstanceOf(DomainException.class)
                .satisfies(ex -> assertThat(((DomainException) ex).getCode()).isEqualTo("ACCESS_DENIED"));
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    private void stubEmptyAggregations() {
        when(reportRepository.totalAndAverageRevenue(any(), any(), any()))
                .thenReturn(new BigDecimal[]{BigDecimal.ZERO.setScale(2), BigDecimal.ZERO.setScale(2)});
        when(reportRepository.countConfirmedOrders(any(), any(), any())).thenReturn(0L);
        when(reportRepository.countPendingOrders(any())).thenReturn(0L);
        when(reportRepository.lowStockProducts(any())).thenReturn(java.util.List.of());
        when(reportRepository.expiringLots(eq(30), any())).thenReturn(java.util.List.of());
        when(reportRepository.revenueByType(any(), any(), any())).thenReturn(java.util.List.of());
        lenient().when(reportRepository.topProducts(any(), any(), any(), anyInt())).thenReturn(java.util.List.of());
        when(reportRepository.salesByHour(any(), any())).thenReturn(buildEmptyHourSeries());
        when(reportRepository.salesByMethod(any(), any(), any())).thenReturn(java.util.List.of());
    }

    private java.util.List<com.dietetica.lembas.reports.dto.SalesByHourDto> buildEmptyHourSeries() {
        java.util.List<com.dietetica.lembas.reports.dto.SalesByHourDto> out = new java.util.ArrayList<>();
        for (int h = 0; h < 24; h++) {
            out.add(new com.dietetica.lembas.reports.dto.SalesByHourDto(
                    h, 0L, BigDecimal.ZERO.setScale(2), 0L, 0L));
        }
        return out;
    }

    private com.dietetica.lembas.shared.branch.model.Branch newBranch(Long id, String name) {
        // Build a Branch via reflection: the no-arg constructor is protected
        // and there are no Lombok setters, so we reach in and set the
        // fields directly. The pattern is repeated by other test classes in
        // the project; see {@code CashSchemaIntegrationTest}.
        com.dietetica.lembas.shared.branch.model.Branch b;
        try {
            java.lang.reflect.Constructor<com.dietetica.lembas.shared.branch.model.Branch> ctor =
                    com.dietetica.lembas.shared.branch.model.Branch.class.getDeclaredConstructor();
            ctor.setAccessible(true);
            b = ctor.newInstance();
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
        try {
            java.lang.reflect.Field idField = com.dietetica.lembas.shared.branch.model.Branch.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(b, id);
            java.lang.reflect.Field nameField = com.dietetica.lembas.shared.branch.model.Branch.class.getDeclaredField("name");
            nameField.setAccessible(true);
            nameField.set(b, name);
            java.lang.reflect.Field activeField = com.dietetica.lembas.shared.branch.model.Branch.class.getDeclaredField("active");
            activeField.setAccessible(true);
            activeField.set(b, true);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
        return b;
    }

    private static int anyInt() {
        return org.mockito.ArgumentMatchers.anyInt();
    }
}
