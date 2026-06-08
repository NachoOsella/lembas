package com.dietetica.lembas.inventory.service;

import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.inventory.dto.CreateStockLotRequest;
import com.dietetica.lembas.inventory.dto.DeductionPlan;
import com.dietetica.lembas.inventory.dto.DeductionPlan.DeductionEntry;
import com.dietetica.lembas.inventory.dto.StockLotDto;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.inventory.model.StockLotStatus;
import com.dietetica.lembas.inventory.model.StockMovement;
import com.dietetica.lembas.inventory.model.StockMovementType;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.inventory.repository.StockMovementRepository;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

/** Application service for inventory stock lots, entries, and availability calculations. */
@Service
public class InventoryService {

    private static final int EXPIRING_SOON_DAYS = 30;

    private final StockLotRepository stockLotRepository;
    private final StockMovementRepository stockMovementRepository;
    private final ProductRepository productRepository;
    private final BranchRepository branchRepository;
    private final FefoStockDeductionPolicy fefoPolicy;
    private final Clock clock;

    public InventoryService(
            StockLotRepository stockLotRepository,
            StockMovementRepository stockMovementRepository,
            ProductRepository productRepository,
            BranchRepository branchRepository,
            FefoStockDeductionPolicy fefoPolicy,
            Clock clock
    ) {
        this.stockLotRepository = stockLotRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.productRepository = productRepository;
        this.branchRepository = branchRepository;
        this.fefoPolicy = fefoPolicy;
        this.clock = clock;
    }

    /** Creates a new stock lot and records its PURCHASE_ENTRY movement in the same transaction. */
    @Transactional
    public StockLotDto createStockLot(CreateStockLotRequest request) {
        Product product = productRepository.findByIdAndActiveTrue(request.productId())
                .orElseThrow(() -> new DomainException("PRODUCT_NOT_FOUND", HttpStatus.NOT_FOUND, "Product not found"));
        Branch branch = branchRepository.findById(request.branchId())
                .filter(Branch::isActive)
                .orElseThrow(() -> new DomainException("BRANCH_NOT_FOUND", HttpStatus.NOT_FOUND, "Branch not found"));

        StockLot lot = new StockLot();
        lot.setProduct(product);
        lot.setBranch(branch);
        lot.setInitialQuantity(request.quantity());
        lot.setQuantityAvailable(request.quantity());
        lot.setLotCode(normalizeBlank(request.lotCode()));
        lot.setExpirationDate(request.expirationDate());
        lot.setCostPrice(request.costPrice());
        lot.setUnitCost(request.costPrice() == null ? BigDecimal.ZERO : request.costPrice());

        StockLot savedLot = stockLotRepository.save(lot);
        stockMovementRepository.save(purchaseEntryMovement(savedLot, product, branch, request.quantity()));
        BigDecimal totalAvailable = stockLotRepository.calculateAvailableQuantity(product.getId(), branch.getId());
        return toDto(savedLot, totalAvailable);
    }

    /** Lists stock lots with optional filters for the admin inventory table. */
    @Transactional(readOnly = true)
    public Page<StockLotDto> listLots(Long productId, Long branchId, boolean expiringSoon, Pageable pageable) {
        LocalDate expiringSoonLimit = LocalDate.now(clock).plusDays(EXPIRING_SOON_DAYS);
        return stockLotRepository.searchLots(productId, branchId, expiringSoon, expiringSoonLimit, mapSort(pageable))
                .map(lot -> toDto(lot, null));
    }

    /**
     * Deducts stock from available lots using the FEFO policy inside a single transaction.
     *
     * <p>Lots with quantityAvailable &gt;= 0 are ordered by expiration date (ASC, NULLS LAST)
     * with pessimistic write locks. The policy plans which lots to deduct from, then this
     * method applies the plan, updates each lot, records stock movements, and marks lots
     * as DEPLETED when they reach zero.</p>
     *
     * @param productId the product to deduct from
     * @param branchId  the branch where stock resides
     * @param quantity  positive amount to deduct
     * @param type      the type of movement ({@code POS_SALE} or {@code ONLINE_SALE})
     * @return the deduction plan with per-lot details
     */
    @Transactional
    public DeductionPlan deductStock(Long productId, Long branchId, BigDecimal quantity, StockMovementType type) {
        Product product = productRepository.findByIdAndActiveTrue(productId)
                .orElseThrow(() -> new DomainException("PRODUCT_NOT_FOUND", HttpStatus.NOT_FOUND, "Product not found"));
        Branch branch = branchRepository.findById(branchId)
                .filter(Branch::isActive)
                .orElseThrow(() -> new DomainException("BRANCH_NOT_FOUND", HttpStatus.NOT_FOUND, "Branch not found"));

        List<StockLot> lots = stockLotRepository.findAvailableLotsForUpdate(productId, branchId);
        DeductionPlan plan = fefoPolicy.plan(lots, quantity);

        for (DeductionEntry entry : plan.entries()) {
            StockLot lot = stockLotRepository.findById(entry.stockLotId())
                    .orElseThrow(() -> new DomainException("STOCK_LOT_NOT_FOUND", HttpStatus.NOT_FOUND, "Stock lot not found"));
            BigDecimal updated = entry.lotAvailableAfter();
            lot.setQuantityAvailable(updated);
            if (updated.compareTo(BigDecimal.ZERO) == 0) {
                lot.setStatus(StockLotStatus.DEPLETED);
            }
            stockMovementRepository.save(deductionMovement(lot, product, branch, entry.quantityToDeduct(), type));
        }

        stockLotRepository.flush();
        return plan;
    }

    /** Calculates available stock from stock_lots without using a denormalized cache. */
    @Transactional(readOnly = true)
    public BigDecimal calculateAvailableQuantity(Long productId, Long branchId) {
        return stockLotRepository.calculateAvailableQuantity(productId, branchId);
    }

    /** Builds the immutable movement generated by a purchase entry. */
    private StockMovement purchaseEntryMovement(StockLot lot, Product product, Branch branch, BigDecimal quantity) {
        StockMovement movement = new StockMovement();
        movement.setStockLot(lot);
        movement.setProduct(product);
        movement.setBranch(branch);
        movement.setType(StockMovementType.PURCHASE_ENTRY);
        movement.setQuantity(quantity);
        movement.setUnitCostSnapshot(lot.getUnitCost());
        movement.setReferenceType("STOCK_LOT");
        movement.setReferenceId(lot.getId());
        movement.setReason("Stock lot entry");
        return movement;
    }

    /** Builds the stock movement generated by a FEFO stock deduction. */
    private StockMovement deductionMovement(StockLot lot, Product product, Branch branch, BigDecimal quantity, StockMovementType type) {
        StockMovement movement = new StockMovement();
        movement.setStockLot(lot);
        movement.setProduct(product);
        movement.setBranch(branch);
        movement.setType(type);
        movement.setQuantity(quantity.negate());
        movement.setUnitCostSnapshot(lot.getUnitCost());
        movement.setReferenceType("STOCK_LOT");
        movement.setReferenceId(lot.getId());
        movement.setReason(type == StockMovementType.POS_SALE ? "POS sale deduction" : "Online sale deduction");
        return movement;
    }

    /** Maps frontend sort field names to entity paths used by the stock lot query. */
    private Pageable mapSort(Pageable pageable) {
        if (pageable.getSort().isUnsorted()) {
            return pageable;
        }
        Sort mappedSort = Sort.unsorted();
        for (Sort.Order order : pageable.getSort()) {
            String property = switch (order.getProperty()) {
                case "productName" -> "product.name";
                case "branchName" -> "branch.name";
                default -> order.getProperty();
            };
            mappedSort = mappedSort.and(Sort.by(new Sort.Order(order.getDirection(), property)));
        }
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), mappedSort);
    }

    /** Maps a lot entity to its stable API response. */
    private StockLotDto toDto(StockLot lot, BigDecimal totalAvailable) {
        return new StockLotDto(
                lot.getId(),
                lot.getProduct().getId(),
                lot.getProduct().getName(),
                lot.getBranch().getId(),
                lot.getBranch().getName(),
                lot.getInitialQuantity(),
                lot.getQuantityAvailable(),
                lot.getLotCode(),
                lot.getExpirationDate(),
                lot.getCostPrice(),
                lot.getUnitCost(),
                lot.getStatus().name(),
                lot.getSupplierId(),
                lot.getSupplierProductId(),
                lot.getPurchaseReceiptId(),
                lot.getPurchaseReceiptItemId(),
                totalAvailable
        );
    }

    /** Normalizes optional text fields before persistence. */
    private String normalizeBlank(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
