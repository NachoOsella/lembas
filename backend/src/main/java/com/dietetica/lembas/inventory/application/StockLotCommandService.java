package com.dietetica.lembas.inventory.application;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.catalog.api.ProductLookup;
import com.dietetica.lembas.catalog.model.Product;
import com.dietetica.lembas.inventory.dto.CreateStockLotRequest;
import com.dietetica.lembas.inventory.dto.StockLotDto;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.inventory.model.StockMovement;
import com.dietetica.lembas.inventory.model.StockMovementType;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.inventory.repository.StockMovementRepository;
import com.dietetica.lembas.shared.branch.api.BranchQuery;
import com.dietetica.lembas.shared.branch.model.Branch;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import java.math.BigDecimal;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Application use case for creating inventory lots and purchase-entry movements. */
@Service
public class StockLotCommandService {

    private final StockLotRepository stockLotRepository;
    private final StockMovementRepository stockMovementRepository;
    private final ProductLookup productLookup;
    private final BranchQuery branchQuery;
    private final SecurityContextHelper securityContextHelper;

    public StockLotCommandService(
            StockLotRepository stockLotRepository,
            StockMovementRepository stockMovementRepository,
            ProductLookup productLookup,
            BranchQuery branchQuery,
            SecurityContextHelper securityContextHelper) {
        this.stockLotRepository = stockLotRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.productLookup = productLookup;
        this.branchQuery = branchQuery;
        this.securityContextHelper = securityContextHelper;
    }

    /** {@inheritDoc} */
    @Transactional
    public StockLotDto createStockLot(CreateStockLotRequest request) {
        Product product = productLookup
                .findActiveById(request.productId())
                .orElseThrow(() -> new DomainException("PRODUCT_NOT_FOUND", HttpStatus.NOT_FOUND, "Product not found"));
        Long effectiveBranchId = resolveBranchForUser(request.branchId());
        Branch branch = branchQuery
                .findActiveById(effectiveBranchId)
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
                totalAvailable);
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
