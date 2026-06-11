package com.dietetica.lembas.suppliers.service;

import com.dietetica.lembas.shared.exception.DomainException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Unit tests for supplier price file import (CSV and XLSX). */
@ExtendWith(MockitoExtension.class)
class PriceUpdateImportServiceTest {

    private final PriceUpdateImportService service = new PriceUpdateImportService();

    @Test
    void shouldRejectNullFile() {
        assertThatThrownBy(() -> service.parse(null))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("PRICE_BATCH_FILE_EMPTY");
    }

    @Test
    void shouldRejectEmptyFile() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(true);

        assertThatThrownBy(() -> service.parse(file))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("PRICE_BATCH_FILE_EMPTY");
    }

    @Test
    void shouldRejectFileExceedingSizeLimit() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getSize()).thenReturn(3L * 1024L * 1024L); // 3 MB

        assertThatThrownBy(() -> service.parse(file))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("PRICE_BATCH_FILE_TOO_LARGE");
    }

    @Test
    void shouldRejectUnsupportedExtension() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getSize()).thenReturn(100L);
        when(file.getOriginalFilename()).thenReturn("prices.pdf");

        assertThatThrownBy(() -> service.parse(file))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("PRICE_BATCH_FILE_UNSUPPORTED");
    }

    @Test
    void shouldParseCsvWithAllColumns() {
        String csv = "sku,barcode,name,cost\nSUP-1,779001,Producto A,5200.00\nSUP-2,779002,Producto B,3100.00\n";
        MultipartFile file = csvFile("prices.csv", csv);

        var rows = service.parse(file);

        assertThat(rows).hasSize(2);
        assertThat(rows.get(0).supplierSku()).isEqualTo("SUP-1");
        assertThat(rows.get(0).barcode()).isEqualTo("779001");
        assertThat(rows.get(0).productName()).isEqualTo("Producto A");
        assertThat(rows.get(0).newCost()).isEqualByComparingTo("5200.00");
        assertThat(rows.get(0).hasError()).isFalse();

        assertThat(rows.get(1).supplierSku()).isEqualTo("SUP-2");
        assertThat(rows.get(1).newCost()).isEqualByComparingTo("3100.00");
    }

    @Test
    void shouldParseCsvWithSpanishHeaders() {
        String csv = "codigo,codigo_barras,producto,precio_costo\nSUP-1,779001,Producto A,5200.00\n";
        MultipartFile file = csvFile("prices.csv", csv);

        var rows = service.parse(file);

        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).supplierSku()).isEqualTo("SUP-1");
        assertThat(rows.get(0).barcode()).isEqualTo("779001");
        assertThat(rows.get(0).productName()).isEqualTo("Producto A");
        assertThat(rows.get(0).newCost()).isEqualByComparingTo("5200.00");
    }

    @Test
    void shouldParseCsvWithAlternateHeaders() {
        String csv = "sku,nombre,costo\nSUP-1,Producto A,5200.00\n";
        MultipartFile file = csvFile("prices.csv", csv);

        var rows = service.parse(file);

        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).supplierSku()).isEqualTo("SUP-1");
        assertThat(rows.get(0).productName()).isEqualTo("Producto A");
        assertThat(rows.get(0).newCost()).isEqualByComparingTo("5200.00");
    }

    @Test
    void shouldRejectCsvWithoutRequiredColumns() {
        String csv = "sku,name\nSUP-1,Producto A\n";
        MultipartFile file = csvFile("prices.csv", csv);

        assertThatThrownBy(() -> service.parse(file))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("PRICE_BATCH_REQUIRED_COLUMNS_MISSING");
    }

    @Test
    void shouldRejectCsvWithoutAnyIdentifier() {
        String csv = "cost\n5200.00\n";
        MultipartFile file = csvFile("prices.csv", csv);

        assertThatThrownBy(() -> service.parse(file))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("PRICE_BATCH_REQUIRED_COLUMNS_MISSING");
    }

    @Test
    void shouldReturnErrorRowWhenCsvRowHasNoIdentifier() {
        String csv = "sku,barcode,name,cost\n,,,5200.00\n";
        MultipartFile file = csvFile("prices.csv", csv);

        var rows = service.parse(file);

        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).hasError()).isTrue();
        assertThat(rows.get(0).errorMessage()).contains("SKU, barcode or product name");
    }

    @Test
    void shouldReturnErrorRowWhenCsvCostIsInvalid() {
        String csv = "sku,barcode,name,cost\nSUP-1,779001,Producto A,abc\n";
        MultipartFile file = csvFile("prices.csv", csv);

        var rows = service.parse(file);

        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).hasError()).isTrue();
        assertThat(rows.get(0).errorMessage()).contains("cost is required");
    }

    @Test
    void shouldHandleCommaAsDecimalSeparatorInCsv() {
        String csv = "sku,barcode,name,cost\nSUP-1,779001,Producto A,\"5200,50\"\n";
        MultipartFile file = csvFile("prices.csv", csv);

        var rows = service.parse(file);

        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).newCost()).isEqualByComparingTo("5200.50");
    }

    @Test
    void shouldRejectCsvWithOnlyHeaderAndNoDataRows() {
        String csv = "sku,barcode,name,cost\n";
        MultipartFile file = csvFile("prices.csv", csv);

        assertThatThrownBy(() -> service.parse(file))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("PRICE_BATCH_FILE_EMPTY");
    }

    @Test
    void shouldNotExceedRowLimitOnCsvImport() {
        StringBuilder csv = new StringBuilder("sku,barcode,name,cost\n");
        for (int i = 0; i < 1005; i++) {
            csv.append("SUP-").append(i).append(",,Producto ").append(i).append(",100.00\n");
        }
        MultipartFile file = csvFile("prices.csv", csv.toString());

        var rows = service.parse(file);

        assertThat(rows).hasSize(1000);
    }

    @Test
    void shouldParseXlsxFile() throws IOException {
        byte[] xlsxBytes = createSimpleXlsx();
        MultipartFile file = new MockMultipartFile(
                "file",
                "prices.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                xlsxBytes
        );

        var rows = service.parse(file);

        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).supplierSku()).isEqualTo("SUP-1");
        assertThat(rows.get(0).barcode()).isEqualTo("779001");
        assertThat(rows.get(0).productName()).isEqualTo("Producto A");
        assertThat(rows.get(0).newCost()).isEqualByComparingTo("5200.00");
    }

    @Test
    void shouldRejectXlsxWithoutDataRows() throws IOException {
        byte[] xlsxBytes = createEmptyHeaderXlsx();
        MultipartFile file = new MockMultipartFile(
                "file",
                "empty.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                xlsxBytes
        );

        assertThatThrownBy(() -> service.parse(file))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("PRICE_BATCH_FILE_EMPTY");
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    private MultipartFile csvFile(String filename, String content) {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getSize()).thenReturn((long) content.getBytes(StandardCharsets.UTF_8).length);
        when(file.getOriginalFilename()).thenReturn(filename);
        try {
            when(file.getInputStream()).thenReturn(new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8)));
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        return file;
    }

    /** Creates a minimal valid XLSX with header row + one data row using Apache POI. */
    private byte[] createSimpleXlsx() throws IOException {
        org.apache.poi.xssf.usermodel.XSSFWorkbook wb = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
        var sheet = wb.createSheet("Prices");
        var header = sheet.createRow(0);
        header.createCell(0).setCellValue("sku");
        header.createCell(1).setCellValue("barcode");
        header.createCell(2).setCellValue("name");
        header.createCell(3).setCellValue("cost");
        var row = sheet.createRow(1);
        row.createCell(0).setCellValue("SUP-1");
        row.createCell(1).setCellValue("779001");
        row.createCell(2).setCellValue("Producto A");
        row.createCell(3).setCellValue(5200.00);
        try (var bos = new java.io.ByteArrayOutputStream()) {
            wb.write(bos);
            return bos.toByteArray();
        }
    }

    /** Creates an XLSX with only a header row (no data). */
    private byte[] createEmptyHeaderXlsx() throws IOException {
        org.apache.poi.xssf.usermodel.XSSFWorkbook wb = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
        var sheet = wb.createSheet("Prices");
        var header = sheet.createRow(0);
        header.createCell(0).setCellValue("sku");
        header.createCell(1).setCellValue("name");
        header.createCell(2).setCellValue("cost");
        try (var bos = new java.io.ByteArrayOutputStream()) {
            wb.write(bos);
            return bos.toByteArray();
        }
    }
}
