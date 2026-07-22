package com.dietetica.lembas.inventory.application;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.catalog.api.ProductLookup;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.inventory.api.PosStockCommand;
import com.dietetica.lembas.inventory.api.StockCommand.OnlineOrderDeductionOutcome;
import com.dietetica.lembas.inventory.dto.DeductionPlan;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.inventory.model.StockMovement;
import com.dietetica.lembas.inventory.model.StockMovementType;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.inventory.repository.StockMovementRepository;
import com.dietetica.lembas.inventory.service.FefoStockDeductionPolicy;
import com.dietetica.lembas.orders.api.OrderQuery;
import com.dietetica.lembas.orders.model.Order;
import com.dietetica.lembas.orders.model.OrderItem;
import com.dietetica.lembas.shared.branch.api.BranchQuery;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Application use cases that plan and apply FEFO deductions. */
@Service
public class StockDeductionService implements PosStockCommand {

    private final StockLotRepository stockLotRepository;
    private final StockMovementRepository stockMovementRepository;
    private final ProductLookup productLookup;
    private final BranchQuery branchQuery;
    private final OrderQuery orderQuery;
    private final SecurityContextHelper securityContextHelper;
    private final FefoStockDeductionPolicy fefoPolicy;
    private final FefoStockApplication fefoApplication;

    public StockDeductionService(
            StockLotRepository stockLotRepository,
            StockMovementRepository stockMovementRepository,
            ProductLookup productLookup,
            BranchQuery branchQuery,
            OrderQuery orderQuery,
            SecurityContextHelper securityContextHelper,
            FefoStockDeductionPolicy fefoPolicy) {
        this.stockLotRepository = stockLotRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.productLookup = productLookup;
        this.branchQuery = branchQuery;
        this.orderQuery = orderQuery;
        this.securityContextHelper = securityContextHelper;
        this.fefoPolicy = fefoPolicy;
        this.fefoApplication = new FefoStockApplication(stockMovementRepository);
    }

    /** Deducts stock for an internal use case with a stable generated reason. */
    @Transactional
    public DeductionPlan deductStock(Long productId, Long branchId, BigDecimal quantity, StockMovementType type) {
        return deductStock(productId, branchId, quantity, type, defaultReason(type));
    }

    /** Deducts stock requested by an operator while enforcing their branch scope. */
    @Transactional
    public DeductionPlan deductManualStock(Long productId, Long branchId, BigDecimal quantity, String reason) {
        Long effectiveBranchId = resolveBranchForUser(branchId);
        String normalizedReason = reason == null || reason.isBlank() ? "Manual stock deduction" : reason.trim();
        return deductStock(
                productId, effectiveBranchId, quantity, StockMovementType.MANUAL_ADJUSTMENT, normalizedReason);
    }

    private DeductionPlan deductStock(
            Long productId, Long branchId, BigDecimal quantity, StockMovementType type, String reason) {
        Product product = productLookup
                .findActiveById(productId)
                .orElseThrow(() -> new DomainException("PRODUCT_NOT_FOUND", HttpStatus.NOT_FOUND, "Product not found"));
        Branch branch = requireActiveBranch(branchId);
        List<StockLot> lockedLots = stockLotRepository.findAvailableLotsForUpdate(productId, branchId);
        DeductionPlan plan = fefoPolicy.plan(lockedLots, quantity);
        fefoApplication.apply(
                plan,
                lockedLots,
                (lot, entry) -> deductionMovement(lot, product, branch, entry.quantityToDeduct(), type, reason));
        stockLotRepository.flush();
        return plan;
    }

    /**
     * Deducts every positive line of an approved online order in one transaction.
     *
     * <p>This throwing variant remains available for callers that require insufficient stock to
     * abort their transaction.</p>
     */
    @Transactional
    public void deductForOnlineOrder(Long orderId) {
        requireSuccessfulDeduction(deductOrderIfAvailable(orderId, StockMovementType.ONLINE_SALE));
    }

    /**
     * Attempts an online deduction while returning expected insufficiency normally from the
     * transactional proxy.
     */
    @Transactional
    public OnlineOrderDeductionOutcome tryDeductForOnlineOrder(Long orderId) {
        return deductOrderIfAvailable(orderId, StockMovementType.ONLINE_SALE);
    }

    /**
     * Applies the POS-specific deduction after its order, items, and payment have been persisted
     * in the enclosing POS transaction.
     */
    @Override
    @Transactional
    public void deductForPosOrder(Long orderId) {
        requireSuccessfulDeduction(deductOrderIfAvailable(orderId, StockMovementType.POS_SALE));
    }

    private OnlineOrderDeductionOutcome deductOrderIfAvailable(Long orderId, StockMovementType movementType) {
        Order order = orderQuery
                .findWithItemsById(orderId)
                .orElseThrow(() -> new DomainException("ORDER_NOT_FOUND", HttpStatus.NOT_FOUND, "Order not found"));
        Branch branch = order.getBranch();
        if (branch == null || branch.getId() == null) {
            throw new DomainException("BRANCH_NOT_FOUND", HttpStatus.NOT_FOUND, "Order has no branch");
        }

        List<OrderItemDemand> itemDemands = collectItemDemands(order);
        Map<Long, BigDecimal> totalDemandByProduct = groupDemandByProduct(itemDemands);
        Map<Long, Product> productsById = new HashMap<>();
        Map<Long, List<StockLot>> lockedLotsByProduct = new HashMap<>();

        // TreeMap iteration locks products in a stable order; each repository result is FEFO ordered.
        for (Map.Entry<Long, BigDecimal> productDemand : totalDemandByProduct.entrySet()) {
            Long productId = productDemand.getKey();
            Product product = productLookup
                    .findActiveById(productId)
                    .orElseThrow(() -> new DomainException(
                            "PRODUCT_NOT_FOUND", HttpStatus.NOT_FOUND, "Product not found for order item"));
            productsById.put(productId, product);
            lockedLotsByProduct.put(
                    productId, stockLotRepository.findAvailableLotsForUpdate(productId, branch.getId()));
        }

        for (Map.Entry<Long, BigDecimal> productDemand : totalDemandByProduct.entrySet()) {
            List<StockLot> lockedLots = lockedLotsByProduct.get(productDemand.getKey());
            if (availableQuantity(lockedLots).compareTo(productDemand.getValue()) < 0) {
                return OnlineOrderDeductionOutcome.INSUFFICIENT_STOCK;
            }
        }

        for (OrderItemDemand itemDemand : itemDemands) {
            Product product = productsById.get(itemDemand.productId());
            List<StockLot> lockedLots = lockedLotsByProduct.get(itemDemand.productId());
            DeductionPlan plan = fefoPolicy.plan(lockedLots, itemDemand.quantity());
            fefoApplication.apply(
                    plan,
                    lockedLots,
                    (lot, entry) -> saleMovement(
                            lot, product, branch, order, itemDemand.item(), entry.quantityToDeduct(), movementType));
        }
        stockLotRepository.flush();
        return OnlineOrderDeductionOutcome.DEDUCTED;
    }

    private List<OrderItemDemand> collectItemDemands(Order order) {
        List<OrderItemDemand> itemDemands = new ArrayList<>();
        for (OrderItem item : order.getItems()) {
            Long productId =
                    item.getProduct() == null ? null : item.getProduct().getId();
            if (productId == null) {
                throw new DomainException(
                        "PRODUCT_NOT_FOUND", HttpStatus.NOT_FOUND, "Order item has no product reference");
            }
            BigDecimal quantity = item.getQuantity();
            if (quantity != null && quantity.signum() > 0) {
                itemDemands.add(new OrderItemDemand(item, productId, quantity));
            }
        }
        return itemDemands;
    }

    private Map<Long, BigDecimal> groupDemandByProduct(List<OrderItemDemand> itemDemands) {
        Map<Long, BigDecimal> totalDemandByProduct = new TreeMap<>();
        for (OrderItemDemand itemDemand : itemDemands) {
            totalDemandByProduct.merge(itemDemand.productId(), itemDemand.quantity(), BigDecimal::add);
        }
        return totalDemandByProduct;
    }

    private BigDecimal availableQuantity(List<StockLot> lockedLots) {
        return lockedLots.stream()
                .map(StockLot::getQuantityAvailable)
                .filter(quantity -> quantity != null && quantity.signum() > 0)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void requireSuccessfulDeduction(OnlineOrderDeductionOutcome outcome) {
        if (outcome == OnlineOrderDeductionOutcome.INSUFFICIENT_STOCK) {
            throw new DomainException("INSUFFICIENT_STOCK", HttpStatus.CONFLICT, "Insufficient stock");
        }
    }

    private record OrderItemDemand(OrderItem item, Long productId, BigDecimal quantity) {}

    private Branch requireActiveBranch(Long branchId) {
        if (branchId == null) {
            throw new DomainException("BRANCH_NOT_FOUND", HttpStatus.NOT_FOUND, "Branch not found");
        }
        return branchQuery
                .findActiveById(branchId)
                .orElseThrow(() -> new DomainException("BRANCH_NOT_FOUND", HttpStatus.NOT_FOUND, "Branch not found"));
    }

    private StockMovement deductionMovement(
            StockLot lot, Product product, Branch branch, BigDecimal quantity, StockMovementType type, String reason) {
        StockMovement movement = new StockMovement();
        movement.setStockLot(lot);
        movement.setProduct(product);
        movement.setBranch(branch);
        movement.setType(type);
        movement.setQuantity(quantity.negate());
        movement.setUnitCostSnapshot(lot.getUnitCost());
        movement.setReferenceType("STOCK_LOT");
        movement.setReferenceId(lot.getId());
        movement.setReason(reason);
        return movement;
    }

    private String defaultReason(StockMovementType type) {
        return switch (type) {
            case POS_SALE -> "POS sale deduction";
            case ONLINE_SALE -> "Online sale deduction";
            default -> "Stock deduction";
        };
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

    private StockMovement saleMovement(
            StockLot lot,
            Product product,
            Branch branch,
            Order order,
            OrderItem item,
            BigDecimal quantity,
            StockMovementType movementType) {
        StockMovement movement = new StockMovement();
        movement.setStockLot(lot);
        movement.setProduct(product);
        movement.setBranch(branch);
        movement.setType(movementType);
        movement.setQuantity(quantity.negate());
        movement.setUnitCostSnapshot(lot.getUnitCost());
        movement.setReferenceType("ORDER");
        movement.setReferenceId(order.getId());
        movement.setOrderId(order.getId());
        movement.setReason(
                movementType == StockMovementType.POS_SALE
                        ? "POS sale deduction"
                        : "Online order " + order.getOrderNumber() + " line "
                                + (item.getId() == null ? "" : item.getId()));
        return movement;
    }
}
