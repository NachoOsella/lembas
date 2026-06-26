package com.dietetica.lembas.cash.web;

import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.auth.service.LembasUserDetailsService;
import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.cash.dto.CashMovementDto;
import com.dietetica.lembas.cash.dto.CashSessionDto;
import com.dietetica.lembas.cash.model.CashMovementMethod;
import com.dietetica.lembas.cash.model.CashMovementType;
import com.dietetica.lembas.cash.model.CashSessionStatus;
import com.dietetica.lembas.cash.service.CashService;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.shared.web.GlobalExceptionHandler;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Authorization and endpoint tests for {@link CashSessionController}.
 *
 * <p>Verifies:</p>
 * <ul>
 *   <li>Authenticated ADMIN can open a session selecting a branch (201).</li>
 *   <li>CASH_SESSION_ALREADY_OPEN is mapped to 409.</li>
 *   <li>Missing openingCashAmount is a 400 validation error.</li>
 *   <li>GET /current returns 200 with the open session.</li>
 *   <li>CASH_SESSION_NOT_FOUND is mapped to 404.</li>
 *   <li>Unauthenticated requests are rejected (401).</li>
 * </ul>
 */
@WebMvcTest(controllers = {CashSessionController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
class CashSessionControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private CashService cashService;
    @MockitoBean
    private SecurityContextHelper securityContextHelper;
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
    @MockitoBean
    private LembasUserDetailsService lembasUserDetailsService;

    @Test
    @WithMockUser(roles = "ADMIN")
    void openReturnsCreatedWhenAdminSelectsBranch() throws Exception {
        User admin = new User(null, "admin@lembas.com", "hash", "Admin", "User", null, Role.ADMIN);
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        when(cashService.openCashSession(any(), eq(admin))).thenReturn(dto(5L, 2L));

        String body = """
                {"openingCashAmount": 150.00, "branchId": 2}
                """;

        mockMvc.perform(post("/api/admin/cash-sessions/open")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(5))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.branchId").value(2));
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void openMapsAlreadyOpenTo409() throws Exception {
        User employee = new User(1L, "emp@lembas.com", "hash", "Emp", "Loyee", null, Role.EMPLOYEE);
        when(securityContextHelper.getCurrentUser()).thenReturn(employee);
        when(cashService.openCashSession(any(), eq(employee)))
                .thenThrow(new DomainException("CASH_SESSION_ALREADY_OPEN", HttpStatus.CONFLICT, "Already open"));

        String body = """
                {"openingCashAmount": 100.00}
                """;

        mockMvc.perform(post("/api/admin/cash-sessions/open")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CASH_SESSION_ALREADY_OPEN"));
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void openRejectsMissingAmount() throws Exception {
        User employee = new User(1L, "emp@lembas.com", "hash", "Emp", "Loyee", null, Role.EMPLOYEE);
        when(securityContextHelper.getCurrentUser()).thenReturn(employee);

        String body = """
                {"openingNotes": "no amount"}
                """;

        mockMvc.perform(post("/api/admin/cash-sessions/open")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void openRejectsNegativeAmount() throws Exception {
        User employee = new User(1L, "emp@lembas.com", "hash", "Emp", "Loyee", null, Role.EMPLOYEE);
        when(securityContextHelper.getCurrentUser()).thenReturn(employee);

        String body = """
                {"openingCashAmount": -5}
                """;

        mockMvc.perform(post("/api/admin/cash-sessions/open")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void currentReturnsOpenSession() throws Exception {
        User employee = new User(1L, "emp@lembas.com", "hash", "Emp", "Loyee", null, Role.EMPLOYEE);
        when(securityContextHelper.getCurrentUser()).thenReturn(employee);
        when(cashService.getCurrentSession(null, employee)).thenReturn(dto(11L, 1L));

        mockMvc.perform(get("/api/admin/cash-sessions/current"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(11))
                .andExpect(jsonPath("$.status").value("OPEN"));
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void currentMapsNotFoundTo404() throws Exception {
        User employee = new User(1L, "emp@lembas.com", "hash", "Emp", "Loyee", null, Role.EMPLOYEE);
        when(securityContextHelper.getCurrentUser()).thenReturn(employee);
        when(cashService.getCurrentSession(null, employee))
                .thenThrow(new DomainException("CASH_SESSION_NOT_FOUND", HttpStatus.NOT_FOUND, "No open session"));

        mockMvc.perform(get("/api/admin/cash-sessions/current"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CASH_SESSION_NOT_FOUND"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getByIdReturnsSession() throws Exception {
        when(cashService.getSessionById(7L)).thenReturn(dto(7L, 2L));

        mockMvc.perform(get("/api/admin/cash-sessions/7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.status").value("OPEN"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getByIdMapsNotFoundTo404() throws Exception {
        when(cashService.getSessionById(99L))
                .thenThrow(new DomainException("CASH_SESSION_NOT_FOUND", HttpStatus.NOT_FOUND, "Not found"));

        mockMvc.perform(get("/api/admin/cash-sessions/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CASH_SESSION_NOT_FOUND"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void addMovementReturnsCreated() throws Exception {
        User admin = new User(null, "admin@lembas.com", "hash", "Admin", "User", null, Role.ADMIN);
        when(securityContextHelper.getCurrentUser()).thenReturn(admin);
        CashMovementDto dto = new CashMovementDto(1L, 5L, CashMovementType.CASH_IN, CashMovementMethod.CASH,
                new BigDecimal("200.00"), "Cobro", 2L, "Admin", null);
        when(cashService.addMovement(eq(5L), any(), eq(admin))).thenReturn(dto);

        String body = """
                {"type":"CASH_IN","method":"CASH","amount":200.00,"reason":"Cobro externo"}
                """;

        mockMvc.perform(post("/api/admin/cash-sessions/5/movements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.cashSessionId").value(5))
                .andExpect(jsonPath("$.type").value("CASH_IN"))
                .andExpect(jsonPath("$.amount").value(200.00));
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void addMovementRejectsClosed() throws Exception {
        User employee = new User(1L, "emp@lembas.com", "hash", "Emp", "Loyee", null, Role.EMPLOYEE);
        when(securityContextHelper.getCurrentUser()).thenReturn(employee);
        when(cashService.addMovement(eq(5L), any(), eq(employee)))
                .thenThrow(new DomainException("CASH_MOVEMENT_CLOSED_SESSION", HttpStatus.BAD_REQUEST, "Closed"));

        String body = """
                {"type":"CASH_OUT","method":"TRANSFER","amount":-500.00,"reason":"Pago"}
                """;

        mockMvc.perform(post("/api/admin/cash-sessions/5/movements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("CASH_MOVEMENT_CLOSED_SESSION"));
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void addMovementRejectsMissingReason() throws Exception {
        User employee = new User(1L, "emp@lembas.com", "hash", "Emp", "Loyee", null, Role.EMPLOYEE);
        when(securityContextHelper.getCurrentUser()).thenReturn(employee);

        String body = """
                {"type":"CASH_IN","method":"CASH","amount":100}
                """;

        mockMvc.perform(post("/api/admin/cash-sessions/5/movements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    private static CashSessionDto dto(long id, long branchId) {
        return new CashSessionDto(
                id, CashSessionStatus.OPEN, branchId, "Branch " + branchId,
                null, "Opener", new BigDecimal("100.00"), null, null,
                null, null, null, null, null, null, null, null, null, null, null
        );
    }
}