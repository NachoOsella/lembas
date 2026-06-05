package com.dietetica.lembas.suppliers.service;

import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.suppliers.dto.SupplierDto;
import com.dietetica.lembas.suppliers.dto.SupplierProductCostHistoryDto;
import com.dietetica.lembas.suppliers.dto.SupplierProductDto;
import com.dietetica.lembas.suppliers.dto.SupplierProductRequest;
import com.dietetica.lembas.suppliers.dto.SupplierRequest;
import com.dietetica.lembas.suppliers.model.Supplier;
import com.dietetica.lembas.suppliers.model.SupplierProduct;
import com.dietetica.lembas.suppliers.model.SupplierProductCostHistory;
import com.dietetica.lembas.suppliers.repository.SupplierProductCostHistoryRepository;
import com.dietetica.lembas.suppliers.repository.SupplierProductRepository;
import com.dietetica.lembas.suppliers.repository.SupplierRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Locale;

/** Application service for suppliers, supplier products, and replacement cost history. */
@Service
public class SupplierService {
    private final SupplierRepository supplierRepository;
    private final SupplierProductRepository supplierProductRepository;
    private final SupplierProductCostHistoryRepository costHistoryRepository;
    private final ProductRepository productRepository;

    public SupplierService(
            SupplierRepository supplierRepository,
            SupplierProductRepository supplierProductRepository,
            SupplierProductCostHistoryRepository costHistoryRepository,
            ProductRepository productRepository
    ) {
        this.supplierRepository = supplierRepository;
        this.supplierProductRepository = supplierProductRepository;
        this.costHistoryRepository = costHistoryRepository;
        this.productRepository = productRepository;
    }

    /** Lists active suppliers with optional text search. */
    @Transactional(readOnly = true)
    public Page<SupplierDto> listSuppliers(String search, Pageable pageable) {
        String normalized = normalizeSearch(search);
        if (normalized == null) {
            return supplierRepository.findByActiveTrue(mapSupplierSort(pageable)).map(this::toDto);
        }
        return supplierRepository.searchActive(normalized, mapSupplierSort(pageable)).map(this::toDto);
    }

    /** Returns one active supplier for edit screens. */
    @Transactional(readOnly = true)
    public SupplierDto getSupplier(Long id) {
        return toDto(findSupplier(id));
    }

    /** Creates a supplier after validating business identifiers. */
    @Transactional
    public SupplierDto createSupplier(SupplierRequest request) {
        validateSupplierRequest(request, null);
        Supplier supplier = new Supplier();
        applySupplierRequest(supplier, request);
        return toDto(supplierRepository.save(supplier));
    }

    /** Updates editable supplier fields. */
    @Transactional
    public SupplierDto updateSupplier(Long id, SupplierRequest request) {
        Supplier supplier = findSupplier(id);
        validateSupplierRequest(request, id);
        applySupplierRequest(supplier, request);
        return toDto(supplier);
    }

    /** Soft-deletes a supplier. Existing historical references remain valid. */
    @Transactional
    public void deleteSupplier(Long id) {
        Supplier supplier = findSupplier(id);
        supplier.setActive(false);
    }

    /** Lists active product-supplier associations. */
    @Transactional(readOnly = true)
    public Page<SupplierProductDto> listSupplierProducts(Long productId, Long supplierId, String search, Pageable pageable) {
        String normalized = normalizeSearch(search);
        Page<SupplierProduct> page;
        if (normalized == null) {
            page = supplierProductRepository.findByActive(productId, supplierId, mapSupplierProductSort(pageable));
        } else {
            page = supplierProductRepository.searchActive(productId, supplierId, normalized, mapSupplierProductSort(pageable));
        }
        return page.map(this::toDto);
    }

    /** Returns one active product-supplier association. */
    @Transactional(readOnly = true)
    public SupplierProductDto getSupplierProduct(Long id) {
        return toDto(findSupplierProduct(id));
    }

    /** Creates a product-supplier association and records the initial replacement cost. */
    @Transactional
    public SupplierProductDto createSupplierProduct(SupplierProductRequest request) {
        validateSupplierProductUnique(request.productId(), request.supplierId(), null);
        Product product = findProduct(request.productId());
        Supplier supplier = findSupplier(request.supplierId());
        SupplierProduct supplierProduct = new SupplierProduct();
        supplierProduct.setProduct(product);
        supplierProduct.setSupplier(supplier);
        applySupplierProductRequest(supplierProduct, request);
        SupplierProduct saved = supplierProductRepository.save(supplierProduct);
        costHistoryRepository.save(costHistory(saved, null, saved.getCurrentCost(), "MANUAL_UPDATE"));
        return toDto(saved);
    }

    /** Updates a product-supplier association and records cost history when current cost changes. */
    @Transactional
    public SupplierProductDto updateSupplierProduct(Long id, SupplierProductRequest request) {
        SupplierProduct supplierProduct = findSupplierProduct(id);
        validateSupplierProductUnique(request.productId(), request.supplierId(), id);
        Product product = findProduct(request.productId());
        Supplier supplier = findSupplier(request.supplierId());
        BigDecimal oldCost = supplierProduct.getCurrentCost();
        supplierProduct.setProduct(product);
        supplierProduct.setSupplier(supplier);
        applySupplierProductRequest(supplierProduct, request);
        if (oldCost == null || oldCost.compareTo(supplierProduct.getCurrentCost()) != 0) {
            costHistoryRepository.save(costHistory(supplierProduct, oldCost, supplierProduct.getCurrentCost(), "MANUAL_UPDATE"));
        }
        return toDto(supplierProduct);
    }

    /** Soft-deletes a product-supplier association. */
    @Transactional
    public void deleteSupplierProduct(Long id) {
        SupplierProduct supplierProduct = findSupplierProduct(id);
        supplierProduct.setActive(false);
    }

    /** Lists replacement cost history for a product-supplier association. */
    @Transactional(readOnly = true)
    public Page<SupplierProductCostHistoryDto> listCostHistory(Long supplierProductId, Pageable pageable) {
        findSupplierProduct(supplierProductId);
        return costHistoryRepository.findBySupplierProductIdOrderByValidFromDesc(supplierProductId, pageable)
                .map(this::toDto);
    }

    /** Validates required and unique supplier fields. */
    private void validateSupplierRequest(SupplierRequest request, Long currentId) {
        String cuit = normalizeBlank(request.cuit());
        if (cuit == null) {
            return;
        }
        boolean duplicated = currentId == null
                ? supplierRepository.existsByCuitIgnoreCaseAndActiveTrue(cuit)
                : supplierRepository.existsByCuitIgnoreCaseAndActiveTrueAndIdNot(cuit, currentId);
        if (duplicated) {
            throw new DomainException("SUPPLIER_CUIT_DUPLICATED", HttpStatus.CONFLICT, "Supplier CUIT already exists");
        }
    }

    /** Ensures a product cannot be associated twice with the same supplier. */
    private void validateSupplierProductUnique(Long productId, Long supplierId, Long currentId) {
        boolean duplicated = currentId == null
                ? supplierProductRepository.existsByProductIdAndSupplierIdAndActiveTrue(productId, supplierId)
                : supplierProductRepository.existsByProductIdAndSupplierIdAndActiveTrueAndIdNot(productId, supplierId, currentId);
        if (duplicated) {
            throw new DomainException("SUPPLIER_PRODUCT_DUPLICATED", HttpStatus.CONFLICT, "Product already associated with supplier");
        }
    }

    /** Copies normalized supplier request fields into the entity. */
    private void applySupplierRequest(Supplier supplier, SupplierRequest request) {
        supplier.setName(request.name().trim());
        supplier.setContactName(normalizeBlank(request.contactName()));
        supplier.setPhone(normalizeBlank(request.phone()));
        supplier.setEmail(normalizeBlank(request.email()));
        supplier.setCuit(normalizeBlank(request.cuit()));
    }

    /** Copies normalized product-supplier request fields into the entity. */
    private void applySupplierProductRequest(SupplierProduct supplierProduct, SupplierProductRequest request) {
        supplierProduct.setSupplierSku(normalizeBlank(request.supplierSku()));
        supplierProduct.setCurrentCost(request.currentCost());
        supplierProduct.setPreferred(request.preferred());
    }

    /** Builds a replacement cost history row for manual supplier-product changes. */
    private SupplierProductCostHistory costHistory(SupplierProduct supplierProduct, BigDecimal oldCost, BigDecimal newCost, String source) {
        SupplierProductCostHistory history = new SupplierProductCostHistory();
        history.setSupplierProduct(supplierProduct);
        history.setOldCost(oldCost);
        history.setNewCost(newCost);
        history.setSource(source);
        history.setReferenceType("SUPPLIER_PRODUCT");
        history.setReferenceId(supplierProduct.getId());
        return history;
    }

    /** Finds an active supplier or throws the uniform domain error. */
    private Supplier findSupplier(Long id) {
        return supplierRepository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new DomainException("SUPPLIER_NOT_FOUND", HttpStatus.NOT_FOUND, "Supplier not found"));
    }

    /** Finds an active product-supplier association or throws the uniform domain error. */
    private SupplierProduct findSupplierProduct(Long id) {
        return supplierProductRepository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new DomainException("SUPPLIER_PRODUCT_NOT_FOUND", HttpStatus.NOT_FOUND, "Supplier product not found"));
    }

    /** Finds an active product or throws the uniform domain error. */
    private Product findProduct(Long id) {
        return productRepository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new DomainException("PRODUCT_NOT_FOUND", HttpStatus.NOT_FOUND, "Product not found"));
    }

    /** Maps sortable supplier table fields. */
    private Pageable mapSupplierSort(Pageable pageable) {
        return pageable.getSort().isUnsorted() ? pageable : pageable;
    }

    /** Maps sortable product-supplier table fields to entity paths. */
    private Pageable mapSupplierProductSort(Pageable pageable) {
        if (pageable.getSort().isUnsorted()) {
            return pageable;
        }
        Sort sort = Sort.unsorted();
        for (Sort.Order order : pageable.getSort()) {
            String property = switch (order.getProperty()) {
                case "productName" -> "product.name";
                case "supplierName" -> "supplier.name";
                default -> order.getProperty();
            };
            sort = sort.and(Sort.by(new Sort.Order(order.getDirection(), property)));
        }
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);
    }

    /** Converts blank text to null and trims meaningful values. */
    private String normalizeBlank(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    /** Normalizes search text for case-insensitive JPQL matching. */
    private String normalizeSearch(String value) {
        return value == null || value.isBlank() ? null : value.trim().toLowerCase(Locale.ROOT);
    }

    /** Maps a supplier entity to API DTO. */
    private SupplierDto toDto(Supplier supplier) {
        return new SupplierDto(supplier.getId(), supplier.getName(), supplier.getContactName(), supplier.getPhone(), supplier.getEmail(), supplier.getCuit());
    }

    /** Maps a product-supplier entity to API DTO. */
    private SupplierProductDto toDto(SupplierProduct supplierProduct) {
        Product product = supplierProduct.getProduct();
        Supplier supplier = supplierProduct.getSupplier();
        return new SupplierProductDto(
                supplierProduct.getId(),
                product.getId(),
                product.getName(),
                product.getBarcode(),
                supplier.getId(),
                supplier.getName(),
                supplierProduct.getSupplierSku(),
                supplierProduct.getCurrentCost(),
                supplierProduct.isPreferred()
        );
    }

    /** Maps a cost-history entity to API DTO. */
    private SupplierProductCostHistoryDto toDto(SupplierProductCostHistory history) {
        return new SupplierProductCostHistoryDto(
                history.getId(),
                history.getSupplierProduct().getId(),
                history.getOldCost(),
                history.getNewCost(),
                history.getSource(),
                history.getValidFrom(),
                history.getCreatedAt()
        );
    }
}
