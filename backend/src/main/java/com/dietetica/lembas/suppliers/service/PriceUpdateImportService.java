package com.dietetica.lembas.suppliers.service;

import com.dietetica.lembas.shared.exception.DomainException;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Imports supplier price rows from CSV and XLSX files into normalized preview input rows. */
@Service
public class PriceUpdateImportService {
    private static final int MAX_ROWS = 1000;
    private static final long MAX_FILE_SIZE_BYTES = 2L * 1024L * 1024L;

    /** Parses a supplier file and returns normalized rows with per-row errors when possible. */
    public List<SupplierPriceRow> parse(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new DomainException("PRICE_BATCH_FILE_EMPTY", HttpStatus.BAD_REQUEST, "Supplier price file is empty");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new DomainException("PRICE_BATCH_FILE_TOO_LARGE", HttpStatus.BAD_REQUEST, "Supplier price file must be 2 MB or smaller");
        }
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        try {
            if (name.endsWith(".csv")) {
                return parseCsv(file);
            }
            if (name.endsWith(".xlsx")) {
                return parseXlsx(file);
            }
        } catch (IOException ex) {
            throw new DomainException("PRICE_BATCH_FILE_UNSUPPORTED", HttpStatus.BAD_REQUEST, "Supplier price file could not be read");
        }
        throw new DomainException("PRICE_BATCH_FILE_UNSUPPORTED", HttpStatus.BAD_REQUEST, "Only CSV and XLSX supplier price files are supported");
    }

    /** Parses a CSV file with a first-row header. */
    private List<SupplierPriceRow> parseCsv(MultipartFile file) throws IOException {
        CSVFormat format = CSVFormat.DEFAULT.builder()
                .setHeader()
                .setSkipHeaderRecord(true)
                .setIgnoreEmptyLines(true)
                .setTrim(true)
                .build();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8));
             CSVParser parser = format.parse(reader)) {
            Map<String, Integer> headers = normalizeHeaders(parser.getHeaderMap().keySet().stream().toList());
            validateHeaders(headers);
            List<SupplierPriceRow> rows = new ArrayList<>();
            for (CSVRecord record : parser) {
                if (rows.size() >= MAX_ROWS) {
                    break;
                }
                rows.add(toRow(
                        value(record, headers, "sku"),
                        value(record, headers, "barcode"),
                        value(record, headers, "name"),
                        value(record, headers, "cost")
                ));
            }
            return requireRows(rows);
        }
    }

    /** Parses the first sheet of an XLSX file with a first-row header. */
    private List<SupplierPriceRow> parseXlsx(MultipartFile file) throws IOException {
        DataFormatter formatter = new DataFormatter(Locale.ROOT);
        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(sheet.getFirstRowNum());
            if (headerRow == null) {
                throw new DomainException("PRICE_BATCH_REQUIRED_COLUMNS_MISSING", HttpStatus.BAD_REQUEST, "Supplier price file has no header row");
            }
            List<String> headerNames = new ArrayList<>();
            for (Cell cell : headerRow) {
                headerNames.add(formatter.formatCellValue(cell));
            }
            Map<String, Integer> headers = normalizeHeaders(headerNames);
            validateHeaders(headers);
            List<SupplierPriceRow> rows = new ArrayList<>();
            for (int i = headerRow.getRowNum() + 1; i <= sheet.getLastRowNum() && rows.size() < MAX_ROWS; i++) {
                Row row = sheet.getRow(i);
                if (row == null) {
                    continue;
                }
                rows.add(toRow(
                        value(row, formatter, headers, "sku"),
                        value(row, formatter, headers, "barcode"),
                        value(row, formatter, headers, "name"),
                        value(row, formatter, headers, "cost")
                ));
            }
            return requireRows(rows);
        }
    }

    /** Converts raw cell values into a normalized supplier price row. */
    private SupplierPriceRow toRow(String supplierSku, String barcode, String productName, String costText) {
        String normalizedSku = blankToNull(supplierSku);
        String normalizedBarcode = blankToNull(barcode);
        String normalizedName = blankToNull(productName);
        if (normalizedSku == null && normalizedBarcode == null && normalizedName == null) {
            return new SupplierPriceRow(null, null, null, null, "Row must include SKU, barcode or product name");
        }
        BigDecimal cost = parseCost(costText);
        if (cost == null) {
            return new SupplierPriceRow(normalizedSku, normalizedBarcode, normalizedName, null, "New supplier cost is required and must be numeric");
        }
        return new SupplierPriceRow(normalizedSku, normalizedBarcode, normalizedName, cost, null);
    }

    /** Normalizes supported supplier-list column aliases into canonical keys. */
    private Map<String, Integer> normalizeHeaders(List<String> headers) {
        Map<String, Integer> normalized = new HashMap<>();
        for (int index = 0; index < headers.size(); index++) {
            String header = normalizeHeader(headers.get(index));
            switch (header) {
                case "supplier_sku", "sku", "codigo", "codigo_proveedor" -> normalized.putIfAbsent("sku", index);
                case "barcode", "codigo_barras", "ean" -> normalized.putIfAbsent("barcode", index);
                case "product_name", "name", "nombre", "producto" -> normalized.putIfAbsent("name", index);
                case "new_cost", "cost", "costo", "precio_costo" -> normalized.putIfAbsent("cost", index);
                default -> {
                    // Unknown columns are intentionally ignored to support supplier-specific files.
                }
            }
        }
        return normalized;
    }

    /** Ensures the imported file contains enough columns to create a useful preview. */
    private void validateHeaders(Map<String, Integer> headers) {
        if (!headers.containsKey("cost") || (!headers.containsKey("sku") && !headers.containsKey("barcode") && !headers.containsKey("name"))) {
            throw new DomainException("PRICE_BATCH_REQUIRED_COLUMNS_MISSING", HttpStatus.BAD_REQUEST, "Supplier price file must include cost and at least one product identifier column");
        }
    }

    /** Returns rows or fails if the file only had headers. */
    private List<SupplierPriceRow> requireRows(List<SupplierPriceRow> rows) {
        if (rows.isEmpty()) {
            throw new DomainException("PRICE_BATCH_FILE_EMPTY", HttpStatus.BAD_REQUEST, "Supplier price file has no rows");
        }
        return rows;
    }

    /** Reads a canonical value from a CSV record, returning null when the row is shorter. */
    private String value(CSVRecord record, Map<String, Integer> headers, String key) {
        Integer index = headers.get(key);
        if (index == null) {
            return null;
        }
        try {
            return record.get(index);
        } catch (ArrayIndexOutOfBoundsException ex) {
            return null;
        }
    }

    /** Reads a canonical value from an XLSX row. */
    private String value(Row row, DataFormatter formatter, Map<String, Integer> headers, String key) {
        Integer index = headers.get(key);
        return index == null ? null : formatter.formatCellValue(row.getCell(index));
    }

    /** Parses decimal costs, accepting comma decimal separators from supplier lists. */
    private BigDecimal parseCost(String value) {
        String normalized = blankToNull(value);
        if (normalized == null) {
            return null;
        }
        try {
            String decimal = normalized.contains(",")
                    ? normalized.replace(".", "").replace(',', '.')
                    : normalized;
            return new BigDecimal(decimal);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    /** Normalizes a header for alias matching. */
    private String normalizeHeader(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT).replace(' ', '_').replace('-', '_');
    }

    /** Converts blank text into null after trimming. */
    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
