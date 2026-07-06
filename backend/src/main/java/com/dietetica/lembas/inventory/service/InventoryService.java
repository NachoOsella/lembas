package com.dietetica.lembas.inventory.service;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.catalog.repository.ProductRepository;
import com.dietetica.lembas.inventory.dto.CreateStockLotRequest;
import com.dietetica.lembas.inventory.dto.DeductionPlan;
import com.dietetica.lembas.inventory.dto.DeductionPlan.DeductionEntry;
import com.dietetica.lembas.inventory.dto.StockAdjustmentRequest;
import com.dietetica.lembas.inventory.dto.StockLotDto;
import com.dietetica.lembas.inventory.dto.StockMovementDto;
import com.dietetica.lembas.inventory.dto.StockProductSummaryDto;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.inventory.model.StockLotStatus;
import com.dietetica.lembas.inventory.model.StockMovement;
import com.dietetica.lembas.inventory.model.StockMovementType;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.inventory.repository.StockMovementRepository;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderItem;
import com.dietetica.lembas.orders.repository.OrderRepository;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.branch.repository.BranchRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/** Application service for inventory stock lots, entries, and availability calculations. */
@Service
public class InventoryService {

    private static final int EXPIRING_SOON_DAYS = 30;

    /** Adjustment types allowed for manual stock adjustments. */
    private static final Set<StockMovementType> ADJUSTMENT_TYPES = Set.of(
            StockMovementType.MANUAL_ADJUSTMENT,
            StockMovementType.INTERNAL_CONSUMPTION,
            StockMovementType.WASTE
    );

    private final StockLotRepository stockLotRepository;
    private final StockMovementRepository stockMovementRepository;
    private final ProductRepository productRepository;
    private final BranchRepository branchRepository;
    private final OrderRepository orderRepository;
    private final FefoStockDeductionPolicy fefoPolicy;
    private final SecurityContextHelper securityContextHelper;
    private final Clock clock;

    public InventoryService(
            StockLotRepository stockLotRepository,
            StockMovementRepository stockMovementRepository,
            ProductRepository productRepository,
            BranchRepository branchRepository,
            OrderRepository orderRepository,
            FefoStockDeductionPolicy fefoPolicy,
            SecurityContextHelper securityContextHelper,
            Clock clock
    ) {
        this.stockLotRepository = stockLotRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.productRepository = productRepository;
        this.branchRepository = branchRepository;
        this.orderRepository = orderRepository;
        this.fefoPolicy = fefoPolicy;
        this.securityContextHelper = securityContextHelper;
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

    /** Returns aggregated stock summaries grouped by product and branch. */
    @Transactional(readOnly = true)
    public Page<StockProductSummaryDto> listProductSummaries(String search, Long branchId, boolean expiringSoon, Pageable pageable) {
        LocalDate expiringSoonLimit = LocalDate.now(clock).plusDays(EXPIRING_SOON_DAYS);
        String searchPattern = buildSearchPattern(search);
        return stockLotRepository.searchProductSummaries(searchPattern, branchId, expiringSoon, expiringSoonLimit, mapProductSort(pageable));
    }

    /** Lists stock lots with optional product search and filters for the admin inventory table. */
    @Transactional(readOnly = true)
    public Page<StockLotDto> listLots(String search, Long productId, Long branchId, boolean expiringSoon, Pageable pageable) {
        LocalDate expiringSoonLimit = LocalDate.now(clock).plusDays(EXPIRING_SOON_DAYS);
        String searchPattern = buildSearchPattern(search);
        return stockLotRepository.searchLots(searchPattern, productId, branchId, expiringSoon, expiringSoonLimit, mapSort(pageable))
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

    /**
     * Deducts stock for all items of an online order using the FEFO policy.
     *
     * <p>Triggered by the Mercado Pago webhook when a payment is approved. The
     * order aggregate is loaded with its items, each line is deducted through
     * the FEFO policy in a single transaction, and stock movements are recorded
     * with {@code referenceType = "ORDER"} so the audit trail can be replayed
     * from the order id. Any shortage raises {@code STOCK_CONFLICT} so the
     * caller can mark the order accordingly and contact the customer.</p>
     */
    @Transactional
    public void deductForOnlineOrder(Long orderId) {
        Order order = orderRepository.findWithItemsById(orderId)
                .orElseThrow(() -> new DomainException("ORDER_NOT_FOUND", HttpStatus.NOT_FOUND, "Order not found"));
        Long branchId = order.getBranch() == null ? null : order.getBranch().getId();
        if (branchId == null) {
            throw new DomainException("BRANCH_NOT_FOUND", HttpStatus.NOT_FOUND, "Order has no branch");
        }
        for (OrderItem item : order.getItems()) {
            deductForOnlineOrderItem(order, item, branchId);
        }
        stockLotRepository.flush();
    }

    /**
     * Deducts one order line using the FEFO policy and records a traceable
     * stock movement linked to the order. Fails fast with {@code STOCK_CONFLICT}
     * if available stock is insufficient.
     */
    private void deductForOnlineOrderItem(Order order, OrderItem item, Long branchId) {
        Long productId = item.getProduct() == null ? null : item.getProduct().getId();
        if (productId == null) {
            throw new DomainException("PRODUCT_NOT_FOUND", HttpStatus.NOT_FOUND,
                    "Order item has no product reference");
        }
        BigDecimal required = item.getQuantity();
        if (required == null || required.signum() <= 0) {
            return;
        }
        Product product = productRepository.findByIdAndActiveTrue(productId)
                .orElseThrow(() -> new DomainException("PRODUCT_NOT_FOUND", HttpStatus.NOT_FOUND,
                        "Product not found for order item"));
        Branch branch = order.getBranch();
        if (branch == null) {
            throw new DomainException("BRANCH_NOT_FOUND", HttpStatus.NOT_FOUND, "Order has no branch");
        }

        List<StockLot> lots = stockLotRepository.findAvailableLotsForUpdate(productId, branchId);
        DeductionPlan plan = fefoPolicy.plan(lots, required);
        for (DeductionEntry entry : plan.entries()) {
            StockLot lot = stockLotRepository.findById(entry.stockLotId())
                    .orElseThrow(() -> new DomainException("STOCK_LOT_NOT_FOUND", HttpStatus.NOT_FOUND, "Stock lot not found"));
            BigDecimal updated = entry.lotAvailableAfter();
            lot.setQuantityAvailable(updated);
            if (updated.compareTo(BigDecimal.ZERO) == 0) {
                lot.setStatus(StockLotStatus.DEPLETED);
            }
            stockMovementRepository.save(onlineSaleMovement(lot, product, branch, order, item, entry.quantityToDeduct()));
        }
    }

    /** Builds the stock movement generated by an online sale deduction linked to an order. */
    private StockMovement onlineSaleMovement(StockLot lot, Product product, Branch branch, Order order,
                                              OrderItem item, BigDecimal quantity) {
        StockMovement movement = new StockMovement();
        movement.setStockLot(lot);
        movement.setProduct(product);
        movement.setBranch(branch);
        movement.setType(StockMovementType.ONLINE_SALE);
        movement.setQuantity(quantity.negate());
        movement.setUnitCostSnapshot(lot.getUnitCost());
        movement.setReferenceType("ORDER");
        movement.setReferenceId(order.getId());
        movement.setOrderId(order.getId());
        movement.setReason("Online order " + order.getOrderNumber()
                + " line " + (item.getId() == null ? "" : item.getId()));
        return movement;
    }

    /**
     * Applies a manual stock adjustment and records a traceable movement.
     *
     * <p>Positive quantity increases stock on the specified lot or creates a new lot.
     * Negative quantity decreases stock using FEFO policy or from a specific lot.
     * Reason is mandatory. Only MANUAL_ADJUSTMENT, INTERNAL_CONSUMPTION, and WASTE
     * types are allowed.</p>
     */
    @Transactional
    public void adjustStock(StockAdjustmentRequest request) {
        Product product = productRepository.findByIdAndActiveTrue(request.productId())
                .orElseThrow(() -> new DomainException("PRODUCT_NOT_FOUND", HttpStatus.NOT_FOUND, "Product not found"));
        Branch branch = branchRepository.findById(request.branchId())
                .filter(Branch::isActive)
                .orElseThrow(() -> new DomainException("BRANCH_NOT_FOUND", HttpStatus.NOT_FOUND, "Branch not found"));

        String reason = normalizeBlank(request.reason());
        if (reason == null) {
            throw new DomainException("ADJUSTMENT_REASON_REQUIRED", HttpStatus.BAD_REQUEST,
                    "Reason is mandatory for stock adjustments");
        }

        if (!ADJUSTMENT_TYPES.contains(request.type())) {
            throw new DomainException("INVALID_ADJUSTMENT_TYPE", HttpStatus.BAD_REQUEST,
                    "Type must be MANUAL_ADJUSTMENT, INTERNAL_CONSUMPTION, or WASTE");
        }

        BigDecimal quantity = request.quantity();
        if (quantity.compareTo(BigDecimal.ZERO) == 0) {
            throw new DomainException("ADJUSTMENT_QUANTITY_ZERO", HttpStatus.BAD_REQUEST,
                    "Adjustment quantity must not be zero");
        }
        if (quantity.compareTo(BigDecimal.ZERO) > 0 && typeRequiresNegativeQuantity(request.type())) {
            throw new DomainException("INVALID_ADJUSTMENT_SIGN", HttpStatus.BAD_REQUEST,
                    "Waste and internal consumption adjustments must decrease stock");
        }

        Long currentUserId = securityContextHelper.getCurrentUser().getId();

        if (quantity.compareTo(BigDecimal.ZERO) > 0) {
            applyPositiveAdjustment(product, branch, quantity, request.type(), reason, request.stockLotId(), currentUserId);
        } else {
            applyNegativeAdjustment(product, branch, quantity, request.type(), reason, request.stockLotId(), currentUserId);
        }
    }

    private void applyPositiveAdjustment(Product product, Branch branch, BigDecimal quantity,
                                          StockMovementType type, String reason,
                                          Long stockLotId, Long currentUserId) {
        if (stockLotId != null) {
            StockLot lot = stockLotRepository.findByIdForUpdate(stockLotId)
                    .orElseThrow(() -> new DomainException("STOCK_LOT_NOT_FOUND", HttpStatus.NOT_FOUND, "Stock lot not found"));
            validateLotBelongsToProductAndBranch(lot, product, branch);
            ensureLotIsNotCancelled(lot);
            lot.setQuantityAvailable(lot.getQuantityAvailable().add(quantity));
            lot.setStatus(StockLotStatus.ACTIVE);
            stockMovementRepository.save(adjustmentMovement(lot, product, branch, quantity, type, reason, currentUserId));
        } else {
            StockLot lot = new StockLot();
            lot.setProduct(product);
            lot.setBranch(branch);
            lot.setInitialQuantity(quantity);
            lot.setQuantityAvailable(quantity);
            lot.setStatus(StockLotStatus.ACTIVE);
            lot.setUnitCost(BigDecimal.ZERO);
            StockLot savedLot = stockLotRepository.save(lot);
            stockMovementRepository.save(adjustmentMovement(savedLot, product, branch, quantity, type, reason, currentUserId));
        }
    }

    private void applyNegativeAdjustment(Product product, Branch branch, BigDecimal quantity,
                                          StockMovementType type, String reason,
                                          Long stockLotId, Long currentUserId) {
        BigDecimal positiveQuantity = quantity.negate();

        if (stockLotId != null) {
            StockLot lot = stockLotRepository.findByIdForUpdate(stockLotId)
                    .orElseThrow(() -> new DomainException("STOCK_LOT_NOT_FOUND", HttpStatus.NOT_FOUND, "Stock lot not found"));
            validateLotBelongsToProductAndBranch(lot, product, branch);
            ensureLotIsActive(lot);
            if (lot.getQuantityAvailable().compareTo(positiveQuantity) < 0) {
                throw new DomainException("INSUFFICIENT_STOCK", HttpStatus.CONFLICT,
                        "Stock lot has insufficient available quantity");
            }
            BigDecimal updated = lot.getQuantityAvailable().subtract(positiveQuantity);
            lot.setQuantityAvailable(updated);
            if (updated.compareTo(BigDecimal.ZERO) == 0) {
                lot.setStatus(StockLotStatus.DEPLETED);
            }
            stockMovementRepository.save(adjustmentMovement(lot, product, branch, quantity, type, reason, currentUserId));
        } else {
            List<StockLot> lots = stockLotRepository.findAvailableLotsForUpdate(product.getId(), branch.getId());
            DeductionPlan plan = fefoPolicy.plan(lots, positiveQuantity);
            for (DeductionEntry entry : plan.entries()) {
                StockLot lot = stockLotRepository.findById(entry.stockLotId())
                        .orElseThrow(() -> new DomainException("STOCK_LOT_NOT_FOUND", HttpStatus.NOT_FOUND, "Stock lot not found"));
                BigDecimal updated = entry.lotAvailableAfter();
                lot.setQuantityAvailable(updated);
                if (updated.compareTo(BigDecimal.ZERO) == 0) {
                    lot.setStatus(StockLotStatus.DEPLETED);
                }
                stockMovementRepository.save(adjustmentMovement(lot, product, branch,
                        entry.quantityToDeduct().negate(), type, reason, currentUserId));
            }
            stockLotRepository.flush();
        }
    }

    /** Returns paginated stock movements with optional filters. */
    @Transactional(readOnly = true)
    public Page<StockMovementDto> listMovements(StockMovementType type, Long productId, Long branchId,
                                                String search, LocalDate from, LocalDate to, Pageable pageable) {
        OffsetDateTime fromDate = from != null ? from.atStartOfDay(ZoneOffset.UTC).toOffsetDateTime() : null;
        OffsetDateTime toDate = to != null ? to.atTime(LocalTime.MAX).atOffset(ZoneOffset.UTC) : null;
        String searchPattern = buildSearchPattern(search);
        return stockMovementRepository
                .findAll(movementSearchSpec(type, productId, branchId, searchPattern, fromDate, toDate), mapMovementSort(pageable))
                .map(this::toMovementDto);
    }

    /**
     * Builds dynamic movement filters without binding null temporal parameters.
     *
     * <p>PostgreSQL cannot infer a type for expressions like {@code ? is null}
     * when the date parameter is absent, so only active filters are added.
     */
    private Specification<StockMovement> movementSearchSpec(StockMovementType type, Long productId, Long branchId,
                                                            String searchPattern, OffsetDateTime fromDate,
                                                            OffsetDateTime toDate) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (type != null) {
                predicates.add(criteriaBuilder.equal(root.get("type"), type));
            }
            if (productId != null) {
                predicates.add(criteriaBuilder.equal(root.get("product").get("id"), productId));
            }
            if (branchId != null) {
                predicates.add(criteriaBuilder.equal(root.get("branch").get("id"), branchId));
            }
            if (searchPattern != null) {
                predicates.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("product").get("name")), searchPattern));
            }
            if (fromDate != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), fromDate));
            }
            if (toDate != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("createdAt"), toDate));
            }
            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }

    /** Returns true when the movement type can only represent stock decreases. */
    private boolean typeRequiresNegativeQuantity(StockMovementType type) {
        return type == StockMovementType.WASTE || type == StockMovementType.INTERNAL_CONSUMPTION;
    }

    /** Verifies that a manually selected lot belongs to the requested product and branch. */
    private void validateLotBelongsToProductAndBranch(StockLot lot, Product product, Branch branch) {
        if (!lot.getProduct().getId().equals(product.getId()) || !lot.getBranch().getId().equals(branch.getId())) {
            throw new DomainException("STOCK_LOT_MISMATCH", HttpStatus.BAD_REQUEST,
                    "Stock lot does not belong to the specified product and branch");
        }
    }

    /** Prevents stock changes on cancelled lots while allowing depleted lots to be reactivated by positive adjustments. */
    private void ensureLotIsNotCancelled(StockLot lot) {
        if (lot.getStatus() == StockLotStatus.CANCELLED) {
            throw new DomainException("STOCK_LOT_NOT_ACTIVE", HttpStatus.CONFLICT,
                    "Cancelled stock lots cannot be adjusted");
        }
    }

    /** Ensures a lot can be used as a source for stock decreases. */
    private void ensureLotIsActive(StockLot lot) {
        if (lot.getStatus() != StockLotStatus.ACTIVE) {
            throw new DomainException("STOCK_LOT_NOT_ACTIVE", HttpStatus.CONFLICT,
                    "Only active stock lots can be decreased");
        }
    }

    /** Calculates available stock from stock_lots without using a denormalized cache. */
    @Transactional(readOnly = true)
    public BigDecimal calculateAvailableQuantity(Long productId, Long branchId) {
        return stockLotRepository.calculateAvailableQuantity(productId, branchId);
    }

    /**
     * Reverses all sale stock movements linked to an order by restoring quantity to the
     * original lots and recording CANCELLATION_RETURN movements.
     *
     * <p>If no sale movements exist for the order (e.g. PENDING_PAYMENT, PAYMENT_FAILED,
     * STOCK_CONFLICT), the method is a no-op and returns zero. Otherwise each original
     * movement is paired with a positive CANCELLATION_RETURN movement that credits the
     * same lot. Lots that had been transitioned to DEPLETED by the original sales are
     * reactivated to ACTIVE when their quantity becomes positive again.</p>
     *
     * <p>Must run inside an active transaction; lots are locked with PESSIMISTIC_WRITE
     * via {@link StockLotRepository#findByIdForUpdate(Long)}.</p>
     *
     * @param orderId the order whose stock should be reversed
     * @return the number of stock movements reversed (0 when no sale movements exist)
     * @throws DomainException with code {@code STOCK_LOT_NOT_FOUND} if a referenced
     *                          lot has been physically deleted
     */
    @Transactional
    public int reverseMovementsForOrder(Long orderId) {
        List<StockMovement> saleMovements = stockMovementRepository.findSaleMovementsByOrderId(orderId);
        if (saleMovements.isEmpty()) {
            return 0;
        }
        int reversed = 0;
        for (StockMovement original : saleMovements) {
            Long lotId = original.getStockLot() == null ? null : original.getStockLot().getId();
            if (lotId == null) {
                throw new DomainException("STOCK_LOT_NOT_FOUND", HttpStatus.NOT_FOUND,
                        "Stock movement has no lot reference; cannot reverse");
            }
            StockLot lot = stockLotRepository.findByIdForUpdate(lotId)
                    .orElseThrow(() -> new DomainException("STOCK_LOT_NOT_FOUND", HttpStatus.NOT_FOUND,
                            "Stock lot " + lotId + " no longer exists; cannot reverse"));
            BigDecimal reversalQty = original.getQuantity().abs();
            BigDecimal updated = lot.getQuantityAvailable().add(reversalQty);
            lot.setQuantityAvailable(updated);
            if (updated.compareTo(BigDecimal.ZERO) > 0 && lot.getStatus() == StockLotStatus.DEPLETED) {
                lot.setStatus(StockLotStatus.ACTIVE);
            }
            stockMovementRepository.save(cancellationReturnMovement(original, lot, reversalQty));
            reversed++;
        }
        return reversed;
    }

    /** Builds the positive CANCELLATION_RETURN movement paired with an original sale movement. */
    private StockMovement cancellationReturnMovement(StockMovement original, StockLot lot, BigDecimal quantity) {
        StockMovement movement = new StockMovement();
        movement.setStockLot(lot);
        movement.setProduct(original.getProduct());
        movement.setBranch(original.getBranch());
        movement.setType(StockMovementType.CANCELLATION_RETURN);
        movement.setQuantity(quantity);
        movement.setUnitCostSnapshot(lot.getUnitCost());
        movement.setReferenceType("ORDER");
        movement.setReferenceId(original.getOrderId());
        movement.setOrderId(original.getOrderId());
        movement.setReason("Cancellation return for order " + original.getOrderId());
        return movement;
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

    /** Builds the stock movement generated by a manual adjustment. */
    private StockMovement adjustmentMovement(StockLot lot, Product product, Branch branch, BigDecimal quantity,
                                              StockMovementType type, String reason, Long currentUserId) {
        StockMovement movement = new StockMovement();
        movement.setStockLot(lot);
        movement.setProduct(product);
        movement.setBranch(branch);
        movement.setType(type);
        movement.setQuantity(quantity);
        movement.setUnitCostSnapshot(lot.getUnitCost());
        movement.setReferenceType("STOCK_ADJUSTMENT");
        movement.setReferenceId(lot.getId());
        movement.setReason(reason);
        movement.setCreatedByUserId(currentUserId);
        return movement;
    }

    /** Maps a StockMovement entity to its API response DTO. */
    private StockMovementDto toMovementDto(StockMovement m) {
        return new StockMovementDto(
                m.getId(),
                m.getStockLot().getId(),
                m.getProduct().getId(),
                m.getProduct().getName(),
                m.getBranch().getId(),
                m.getBranch().getName(),
                m.getType().name(),
                m.getQuantity(),
                m.getUnitCostSnapshot(),
                m.getReason(),
                m.getCreatedByUserId(),
                m.getCreatedAt()
        );
    }

    /** Maps frontend sort field names to entity paths used by the aggregated product query. */
    private Pageable mapProductSort(Pageable pageable) {
        if (pageable.getSort().isUnsorted()) {
            return pageable;
        }
        Sort mappedSort = Sort.unsorted();
        for (Sort.Order order : pageable.getSort()) {
            String property = switch (order.getProperty()) {
                case "productName" -> "p.name";
                case "branchName" -> "b.name";
                default -> null;
            };
            if (property == null) {
                return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
            }
            mappedSort = mappedSort.and(Sort.by(new Sort.Order(order.getDirection(), property)));
        }
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), mappedSort);
    }

    /** Maps frontend sort field names to entity paths used by the movement query. */
    private Pageable mapMovementSort(Pageable pageable) {
        if (pageable.getSort().isUnsorted()) {
            return pageable;
        }
        Sort mappedSort = Sort.unsorted();
        for (Sort.Order order : pageable.getSort()) {
            String property = switch (order.getProperty()) {
                case "productName" -> "product.name";
                case "branchName" -> "branch.name";
                case "type", "createdAt", "quantity", "reason" -> order.getProperty();
                default -> null;
            };
            if (property == null) {
                return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Direction.DESC, "createdAt"));
            }
            mappedSort = mappedSort.and(Sort.by(new Sort.Order(order.getDirection(), property)));
        }
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), mappedSort);
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

    /** Builds a LIKE pattern from search text, or null when empty. */
    private String buildSearchPattern(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return "%" + value.trim().toLowerCase() + "%";
    }
}
