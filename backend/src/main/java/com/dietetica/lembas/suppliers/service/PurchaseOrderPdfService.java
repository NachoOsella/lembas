package com.dietetica.lembas.suppliers.service;

import com.dietetica.lembas.suppliers.model.PurchaseOrder;
import com.dietetica.lembas.suppliers.model.PurchaseOrderItem;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/** Generates on-demand PDFs for supplier purchase orders. */
@Service
public class PurchaseOrderPdfService {
    private static final Font TITLE_FONT = new Font(Font.HELVETICA, 18, Font.BOLD);
    private static final Font SECTION_FONT = new Font(Font.HELVETICA, 11, Font.BOLD);
    private static final Font BODY_FONT = new Font(Font.HELVETICA, 10, Font.NORMAL);
    private static final Font TOTAL_FONT = new Font(Font.HELVETICA, 12, Font.BOLD);
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final BusinessPdfProperties businessProperties;
    private final NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("es-AR"));

    public PurchaseOrderPdfService(BusinessPdfProperties businessProperties) {
        this.businessProperties = businessProperties;
    }

    /** Builds a PDF document as bytes without persisting any print job. */
    public byte[] generate(PurchaseOrder order) {
        try {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4, 36, 36, 36, 36);
            PdfWriter.getInstance(document, output);
            document.open();
            addHeader(document, order);
            addParties(document, order);
            addItems(document, order);
            addNotes(document, order);
            document.close();
            return output.toByteArray();
        } catch (DocumentException exception) {
            throw new IllegalStateException("Could not generate purchase order PDF", exception);
        }
    }

    /** Adds the business heading and purchase order metadata. */
    private void addHeader(Document document, PurchaseOrder order) throws DocumentException {
        Paragraph title = new Paragraph("Orden de compra #" + order.getId(), TITLE_FONT);
        title.setAlignment(Element.ALIGN_CENTER);
        document.add(title);
        document.add(spacer());

        PdfPTable table = new PdfPTable(new float[]{2, 1});
        table.setWidthPercentage(100);
        table.addCell(borderless(businessProperties.displayName() + businessLine("CUIT", businessProperties.cuit())
                + businessLine("Direccion", businessProperties.address())
                + businessLine("Telefono", businessProperties.phone())
                + businessLine("Email", businessProperties.email())));
        table.addCell(borderless("Estado: " + order.getStatus().name()
                + "\nFecha: " + formatDateTime(order.getOrderDate())
                + "\nEntrega esperada: " + (order.getExpectedDeliveryDate() == null ? "Sin fecha" : DATE_FORMAT.format(order.getExpectedDeliveryDate()))));
        document.add(table);
    }

    /** Adds supplier and branch data. */
    private void addParties(Document document, PurchaseOrder order) throws DocumentException {
        document.add(spacer());
        PdfPTable table = new PdfPTable(new float[]{1, 1});
        table.setWidthPercentage(100);
        table.addCell(labeledCell("Proveedor", order.getSupplier().getName()
                + optionalLine("CUIT", order.getSupplier().getCuit())
                + optionalLine("Telefono", order.getSupplier().getPhone())
                + optionalLine("Email", order.getSupplier().getEmail())));
        table.addCell(labeledCell("Sucursal", order.getBranch().getName()));
        document.add(table);
    }

    /** Adds the item table with quantities, unit costs, subtotals, and total. */
    private void addItems(Document document, PurchaseOrder order) throws DocumentException {
        document.add(spacer());
        PdfPTable table = new PdfPTable(new float[]{3, 1, 1, 1});
        table.setWidthPercentage(100);
        table.addCell(headerCell("Producto"));
        table.addCell(headerCell("Cantidad"));
        table.addCell(headerCell("Costo unit."));
        table.addCell(headerCell("Subtotal"));

        for (PurchaseOrderItem item : order.getItems()) {
            table.addCell(bodyCell(item.getProduct().getName() + optionalLine("SKU prov.", item.getSupplierProduct() == null ? null : item.getSupplierProduct().getSupplierSku())));
            table.addCell(bodyCell(item.getQuantityOrdered().toPlainString()));
            table.addCell(bodyCell(currency(item.getUnitCost())));
            table.addCell(bodyCell(currency(item.getSubtotal())));
        }

        PdfPCell totalLabel = bodyCell("Total");
        totalLabel.setColspan(3);
        totalLabel.setHorizontalAlignment(Element.ALIGN_RIGHT);
        totalLabel.setPhrase(new Phrase("Total", TOTAL_FONT));
        table.addCell(totalLabel);
        table.addCell(new PdfPCell(new Phrase(currency(total(order)), TOTAL_FONT)));
        document.add(table);
    }

    /** Adds free-form notes when the order includes them. */
    private void addNotes(Document document, PurchaseOrder order) throws DocumentException {
        if (order.getNotes() == null || order.getNotes().isBlank()) {
            return;
        }
        document.add(spacer());
        document.add(new Paragraph("Notas", SECTION_FONT));
        document.add(new Paragraph(order.getNotes(), BODY_FONT));
    }

    /** Creates a labeled table cell. */
    private PdfPCell labeledCell(String label, String value) {
        PdfPCell cell = bodyCell(label + "\n" + value);
        cell.setPadding(8);
        return cell;
    }

    /** Creates a header cell for item tables. */
    private PdfPCell headerCell(String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, SECTION_FONT));
        cell.setPadding(6);
        return cell;
    }

    /** Creates a standard body cell. */
    private PdfPCell bodyCell(String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, BODY_FONT));
        cell.setPadding(6);
        return cell;
    }

    /** Creates a cell without borders for the header block. */
    private PdfPCell borderless(String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, BODY_FONT));
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(4);
        return cell;
    }

    /** Creates a small vertical spacer. */
    private Paragraph spacer() {
        return new Paragraph(" ", BODY_FONT);
    }

    /** Formats a money amount for Argentina locale. */
    private String currency(BigDecimal amount) {
        return currencyFormat.format(amount);
    }

    /** Computes the order total from item subtotals. */
    private BigDecimal total(PurchaseOrder order) {
        return order.getItems().stream().map(PurchaseOrderItem::getSubtotal).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** Formats an optional metadata line for business data. */
    private String businessLine(String label, String value) {
        return value == null || value.isBlank() ? "" : "\n" + label + ": " + value;
    }

    /** Formats an optional line inside a PDF cell. */
    private String optionalLine(String label, String value) {
        return value == null || value.isBlank() ? "" : "\n" + label + ": " + value;
    }

    /** Formats an order date-time safely. */
    private String formatDateTime(java.time.OffsetDateTime dateTime) {
        return dateTime == null ? "Sin fecha" : DATE_FORMAT.format(dateTime.toLocalDate());
    }
}
