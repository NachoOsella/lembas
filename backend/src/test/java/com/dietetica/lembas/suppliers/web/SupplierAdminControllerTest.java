package com.dietetica.lembas.suppliers.web;

import com.dietetica.lembas.auth.service.JwtAuthenticationFilter;
import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.auth.service.LembasUserDetailsService;
import com.dietetica.lembas.shared.web.GlobalExceptionHandler;
import com.dietetica.lembas.suppliers.dto.SupplierDto;
import com.dietetica.lembas.suppliers.dto.SupplierRequest;
import com.dietetica.lembas.suppliers.service.SupplierService;
import com.dietetica.lembas.users.web.SecurityConfigForTest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Web slice tests for supplier admin CRUD endpoints. */
@WebMvcTest(controllers = {SupplierAdminController.class, GlobalExceptionHandler.class})
@Import(SecurityConfigForTest.class)
@AutoConfigureMockMvc(addFilters = false)
class SupplierAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private SupplierService supplierService;
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
    @MockitoBean
    private LembasUserDetailsService userDetailsService;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return200_when_adminListsSuppliers() throws Exception {
        when(supplierService.listSuppliers(isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(dto(1L, "Distribuidora")), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/admin/suppliers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1L))
                .andExpect(jsonPath("$.content[0].name").value("Distribuidora"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return200_when_adminListsSuppliersWithSearch() throws Exception {
        when(supplierService.listSuppliers(eq("distri"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(dto(1L, "Distribuidora")), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/admin/suppliers?search=distri"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Distribuidora"));
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    void Should_return200_when_managerGetsOneSupplier() throws Exception {
        when(supplierService.getSupplier(1L)).thenReturn(dto(1L, "Distribuidora"));

        mockMvc.perform(get("/api/admin/suppliers/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.name").value("Distribuidora"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return201_when_adminCreatesSupplier() throws Exception {
        SupplierRequest request = new SupplierRequest("Nuevo Proveedor", "Juan", "12345678", "juan@test.com", "20-12345678-9");
        when(supplierService.createSupplier(any(SupplierRequest.class)))
                .thenReturn(dto(2L, "Nuevo Proveedor"));

        mockMvc.perform(post("/api/admin/suppliers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(2L))
                .andExpect(jsonPath("$.name").value("Nuevo Proveedor"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return200_when_adminUpdatesSupplier() throws Exception {
        SupplierRequest request = new SupplierRequest("Modificado", null, null, null, null);
        when(supplierService.updateSupplier(eq(1L), any(SupplierRequest.class)))
                .thenReturn(dto(1L, "Modificado"));

        mockMvc.perform(put("/api/admin/suppliers/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Modificado"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return204_when_adminDeletesSupplier() throws Exception {
        doNothing().when(supplierService).deleteSupplier(1L);

        mockMvc.perform(delete("/api/admin/suppliers/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return400_when_createSupplierWithBlankName() throws Exception {
        String invalid = """
                {"name": "", "contactName": "Juan", "phone": "123", "email": "juan@test.com", "cuit": "20-12345678-9"}
                """;

        mockMvc.perform(post("/api/admin/suppliers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalid))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    void Should_return200_when_managerCreatesSupplier() throws Exception {
        SupplierRequest request = new SupplierRequest("Manager Crea", "Ana", null, null, null);
        when(supplierService.createSupplier(any(SupplierRequest.class)))
                .thenReturn(dto(3L, "Manager Crea"));

        mockMvc.perform(post("/api/admin/suppliers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(3L));
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void Should_return403_when_employeeAccessesSuppliers() throws Exception {
        mockMvc.perform(get("/api/admin/suppliers"))
                .andExpect(status().isForbidden());
    }

    /** Creates a test supplier DTO. */
    private SupplierDto dto(Long id, String name) {
        return new SupplierDto(id, name, "Contacto", "12345678", "mail@test.com", "20-12345678-9");
    }
}
