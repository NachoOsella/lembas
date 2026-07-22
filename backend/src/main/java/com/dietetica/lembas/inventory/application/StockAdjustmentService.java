package com.dietetica.lembas.inventory.application;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.catalog.api.ProductLookup;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.inventory.dto.DeductionPlan;
import com.dietetica.lembas.inventory.dto.StockAdjustmentRequest;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.inventory.model.StockLotStatus;
import com.dietetica.lembas.inventory.model.StockMovement;
import com.dietetica.lembas.inventory.model.StockMovementType;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.inventory.repository.StockMovementRepository;
import com.dietetica.lembas.inventory.service.FefoStockDeductionPolicy;
import com.dietetica.lembas.shared.branch.api.BranchQuery;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import java.math.BigDecimal;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Application use case for traceable manual inventory adjustments. */
@Service
public class StockAdjustmentService {

    private static final Set<StockMovementType> ADJUSTMENT_TYPES = Set.of(
            StockMovementType.MANUAL_ADJUSTMENT, StockMovementType.INTERNAL_CONSUMPTION, StockMovementType.WASTE);

    private final StockLotRepository stockLotRepository;
    private final StockMovementRepository stockMovementRepository;
    private final ProductLookup productLookup;
    private final BranchQuery branchQuery;
    private final SecurityContextHelper securityContextHelper;
    private final FefoStockDeductionPolicy fefoPolicy;
    private final FefoStockApplication fefoApplication;

    public StockAdjustmentService(
            StockLotRepository stockLotRepository,
            StockMovementRepository stockMovementRepository,
            ProductLookup productLookup,
            BranchQuery branchQuery,
            SecurityContextHelper securityContextHelper,
            FefoStockDeductionPolicy fefoPolicy) {
        this.stockLotRepository = stockLotRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.productLookup = productLookup;
        this.branchQuery = branchQuery;
        this.securityContextHelper = securityContextHelper;
        this.fefoPolicy = fefoPolicy;
        this.fefoApplication = new FefoStockApplication(stockMovementRepository);
    }

    /** {@inheritDoc} */
    @Transactional
    public void adjustStock(StockAdjustmentRequest request) {
        Long effectiveBranchId = resolveBranchForUser(request.branchId());
        Product product = productLookup
                .findActiveById(request.productId())
                .orElseThrow(() -> new DomainException("PRODUCT_NOT_FOUND", HttpStatus.NOT_FOUND, "Product not found"));
        Branch branch = branchQuery
                .findActiveById(effectiveBranchId)
                .orElseThrow(() -> new DomainException("BRANCH_NOT_FOUND", HttpStatus.NOT_FOUND, "Branch not found"));

        String reason = normalizeBlank(request.reason());
        if (reason == null) {
            throw new DomainException(
                    "ADJUSTMENT_REASON_REQUIRED", HttpStatus.BAD_REQUEST, "Reason is mandatory for stock adjustments");
        }
        if (!ADJUSTMENT_TYPES.contains(request.type())) {
            throw new DomainException(
                    "INVALID_ADJUSTMENT_TYPE",
                    HttpStatus.BAD_REQUEST,
                    "Type must be MANUAL_ADJUSTMENT, INTERNAL_CONSUMPTION, or WASTE");
        }

        BigDecimal quantity = request.quantity();
        if (quantity.compareTo(BigDecimal.ZERO) == 0) {
            throw new DomainException(
                    "ADJUSTMENT_QUANTITY_ZERO", HttpStatus.BAD_REQUEST, "Adjustment quantity must not be zero");
        }
        if (quantity.signum() > 0 && typeRequiresNegativeQuantity(request.type())) {
            throw new DomainException(
                    "INVALID_ADJUSTMENT_SIGN",
                    HttpStatus.BAD_REQUEST,
                    "Waste and internal consumption adjustments must decrease stock");
        }

        User currentUser = securityContextHelper.getCurrentUser();
        Long currentUserId = currentUser == null ? null : currentUser.getId();
        if (quantity.signum() > 0) {
            applyPositiveAdjustment(
                    product, branch, quantity, request.type(), reason, request.stockLotId(), currentUserId);
        } else {
            applyNegativeAdjustment(
                    product, branch, quantity, request.type(), reason, request.stockLotId(), currentUserId);
        }
    }

    private void applyPositiveAdjustment(
            Product product,
            Branch branch,
            BigDecimal quantity,
            StockMovementType type,
            String reason,
            Long stockLotId,
            Long currentUserId) {
        if (stockLotId != null) {
            StockLot lot = findLockedLot(stockLotId);
            validateLotBelongsToProductAndBranch(lot, product, branch);
            ensureLotIsNotCancelled(lot);
            lot.setQuantityAvailable(lot.getQuantityAvailable().add(quantity));
            lot.setStatus(StockLotStatus.ACTIVE);
            stockMovementRepository.save(
                    adjustmentMovement(lot, product, branch, quantity, type, reason, currentUserId));
            return;
        }

        StockLot lot = new StockLot();
        lot.setProduct(product);
        lot.setBranch(branch);
        lot.setInitialQuantity(quantity);
        lot.setQuantityAvailable(quantity);
        lot.setStatus(StockLotStatus.ACTIVE);
        lot.setUnitCost(BigDecimal.ZERO);
        StockLot savedLot = stockLotRepository.save(lot);
        stockMovementRepository.save(
                adjustmentMovement(savedLot, product, branch, quantity, type, reason, currentUserId));
    }

    private void applyNegativeAdjustment(
            Product product,
            Branch branch,
            BigDecimal quantity,
            StockMovementType type,
            String reason,
            Long stockLotId,
            Long currentUserId) {
        BigDecimal positiveQuantity = quantity.negate();
        if (stockLotId != null) {
            StockLot lot = findLockedLot(stockLotId);
            validateLotBelongsToProductAndBranch(lot, product, branch);
            ensureLotIsActive(lot);
            if (lot.getQuantityAvailable().compareTo(positiveQuantity) < 0) {
                throw new DomainException(
                        "INSUFFICIENT_STOCK", HttpStatus.CONFLICT, "Stock lot has insufficient available quantity");
            }
            BigDecimal updated = lot.getQuantityAvailable().subtract(positiveQuantity);
            lot.setQuantityAvailable(updated);
            if (updated.compareTo(BigDecimal.ZERO) == 0) {
                lot.setStatus(StockLotStatus.DEPLETED);
            }
            stockMovementRepository.save(
                    adjustmentMovement(lot, product, branch, quantity, type, reason, currentUserId));
            return;
        }

        var lockedLots = stockLotRepository.findAvailableLotsForUpdate(product.getId(), branch.getId());
        DeductionPlan plan = fefoPolicy.plan(lockedLots, positiveQuantity);
        fefoApplication.apply(
                plan,
                lockedLots,
                (lot, entry) -> adjustmentMovement(
                        lot, product, branch, entry.quantityToDeduct().negate(), type, reason, currentUserId));
        stockLotRepository.flush();
    }

    private StockLot findLockedLot(Long stockLotId) {
        return stockLotRepository
                .findByIdForUpdate(stockLotId)
                .orElseThrow(
                        () -> new DomainException("STOCK_LOT_NOT_FOUND", HttpStatus.NOT_FOUND, "Stock lot not found"));
    }

    private StockMovement adjustmentMovement(
            StockLot lot,
            Product product,
            Branch branch,
            BigDecimal quantity,
            StockMovementType type,
            String reason,
            Long currentUserId) {
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

    private boolean typeRequiresNegativeQuantity(StockMovementType type) {
        return type == StockMovementType.WASTE || type == StockMovementType.INTERNAL_CONSUMPTION;
    }

    private void validateLotBelongsToProductAndBranch(StockLot lot, Product product, Branch branch) {
        if (!lot.getProduct().getId().equals(product.getId())
                || !lot.getBranch().getId().equals(branch.getId())) {
            throw new DomainException(
                    "STOCK_LOT_MISMATCH",
                    HttpStatus.BAD_REQUEST,
                    "Stock lot does not belong to the specified product and branch");
        }
    }

    private void ensureLotIsNotCancelled(StockLot lot) {
        if (lot.getStatus() == StockLotStatus.CANCELLED) {
            throw new DomainException(
                    "STOCK_LOT_NOT_ACTIVE", HttpStatus.CONFLICT, "Cancelled stock lots cannot be adjusted");
        }
    }

    private void ensureLotIsActive(StockLot lot) {
        if (lot.getStatus() != StockLotStatus.ACTIVE) {
            throw new DomainException(
                    "STOCK_LOT_NOT_ACTIVE", HttpStatus.CONFLICT, "Only active stock lots can be decreased");
        }
    }

    private Long resolveBranchForUser(Long requestedBranchId) {
        User currentUser = securityContextHelper.getCurrentUser();
        if (currentUser == null || currentUser.getRole() == Role.ADMIN) {
            return requestedBranchId;
        }
        if (currentUser.getBranchId() == null) {
            throw new DomainException("INVALID_USER_BRANCH", HttpStatus.BAD_REQUEST, "User has no assigned branch");
        }
        return currentUser.getBranchId();
    }

    private String normalizeBlank(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
