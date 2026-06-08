package com.dietetica.lembas.suppliers.web;

import com.dietetica.lembas.auth.service.JwtAuthenticationFilter;
import com.dietetica.lembas.auth.service.JwtTokenProvider;
import com.dietetica.lembas.auth.service.LembasUserDetailsService;
import com.dietetica.lembas.shared.web.GlobalExceptionHandler;
import com.dietetica.lembas.suppliers.dto.SupplierProductCostHistoryDto;
import com.dietetica.lembas.suppliers.dto.SupplierProductDto;
import com.dietetica.lembas.suppliers.dto.SupplierProductRequest;
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

import java.math.BigDecimal;
import java.time.OffsetDateTime;
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

/** Web slice tests for supplier-product replacement cost endpoints. */
@WebMvcTest(controllers = {SupplierProductAdminController.class, GlobalExceptionHandler.class})
@Import(SecurityConfigForTest.class)
@AutoConfigureMockMvc(addFilters = false)
class SupplierProductAdminControllerTest {

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
    void Should_return200_when_adminListsSupplierProducts() throws Exception {
        when(supplierService.listSupplierProducts(isNull(), isNull(), isNull(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(productDto(1L, "Yerba", "Distribuidora")), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/admin/supplier-products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1L))
                .andExpect(jsonPath("$.content[0].productName").value("Yerba"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    void Should_return200_when_managerListsSupplierProductsWithFilters() throws Exception {
        when(supplierService.listSupplierProducts(eq(10L), eq(20L), eq("yer"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(productDto(1L, "Yerba", "Distribuidora")), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/admin/supplier-products?productId=10&supplierId=20&search=yer"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].productName").value("Yerba"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return200_when_adminGetsOneSupplierProduct() throws Exception {
        when(supplierService.getSupplierProduct(1L)).thenReturn(productDto(1L, "Yerba", "Distribuidora"));

        mockMvc.perform(get("/api/admin/supplier-products/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productName").value("Yerba"))
                .andExpect(jsonPath("$.supplierName").value("Distribuidora"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return201_when_adminCreatesSupplierProduct() throws Exception {
        SupplierProductRequest request = new SupplierProductRequest(10L, 20L, "SKU-1", BigDecimal.valueOf(5000), true);
        when(supplierService.createSupplierProduct(any(SupplierProductRequest.class)))
                .thenReturn(productDto(2L, "Granola", "Distribuidora"));

        mockMvc.perform(post("/api/admin/supplier-products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(2L))
                .andExpect(jsonPath("$.currentCost").value(5000));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return200_when_adminUpdatesSupplierProduct() throws Exception {
        SupplierProductRequest request = new SupplierProductRequest(10L, 20L, "SKU-1", BigDecimal.valueOf(5500), false);
        when(supplierService.updateSupplierProduct(eq(1L), any(SupplierProductRequest.class)))
                .thenReturn(productDto(1L, "Yerba", "Distribuidora"));

        mockMvc.perform(put("/api/admin/supplier-products/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return204_when_adminDeletesSupplierProduct() throws Exception {
        doNothing().when(supplierService).deleteSupplierProduct(1L);

        mockMvc.perform(delete("/api/admin/supplier-products/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return400_when_createSupplierProductWithNegativeCost() throws Exception {
        String invalid = """
                {"productId": 10, "supplierId": 20, "currentCost": -100, "preferred": false}
                """;

        mockMvc.perform(post("/api/admin/supplier-products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalid))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void Should_return200_when_adminListsCostHistory() throws Exception {
        when(supplierService.listCostHistory(eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(costHistoryDto(100L, 1L)), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/admin/supplier-products/1/cost-history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(100L))
                .andExpect(jsonPath("$.content[0].oldCost").value(5000))
                .andExpect(jsonPath("$.content[0].newCost").value(5500));
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void Should_return403_when_employeeAccessesSupplierProducts() throws Exception {
        mockMvc.perform(get("/api/admin/supplier-products"))
                .andExpect(status().isForbidden());
    }

    /** Creates a test supplier-product DTO. */
    private SupplierProductDto productDto(Long id, String productName, String supplierName) {
        return new SupplierProductDto(id, 10L, productName, "779001", 20L, supplierName, "SKU-1", BigDecimal.valueOf(5000), true);
    }

    /** Creates a test cost history DTO. */
    private SupplierProductCostHistoryDto costHistoryDto(Long id, Long supplierProductId) {
        return new SupplierProductCostHistoryDto(
                id,
                supplierProductId,
                BigDecimal.valueOf(5000),
                BigDecimal.valueOf(5500),
                "MANUAL_UPDATE",
                OffsetDateTime.now().minusDays(1),
                OffsetDateTime.now()
        );
    }
}
