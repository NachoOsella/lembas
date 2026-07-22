package com.dietetica.lembas.inventory.application;

import com.dietetica.lembas.auth.service.SecurityContextHelper;
import com.dietetica.lembas.inventory.api.InventoryQuery;
import com.dietetica.lembas.inventory.dto.StockLotDto;
import com.dietetica.lembas.inventory.dto.StockMovementDto;
import com.dietetica.lembas.inventory.dto.StockProductSummaryDto;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.inventory.model.StockMovement;
import com.dietetica.lembas.inventory.model.StockMovementType;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import com.dietetica.lembas.inventory.repository.StockMovementRepository;
import com.dietetica.lembas.shared.exception.DomainException;
import com.dietetica.lembas.users.model.Role;
import com.dietetica.lembas.users.model.User;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Read application use cases for inventory availability, lots, and movements. */
@Service
public class StockQueryService implements InventoryQuery {

    private static final int EXPIRING_SOON_DAYS = 30;

    private final StockLotRepository stockLotRepository;
    private final StockMovementRepository stockMovementRepository;
    private final SecurityContextHelper securityContextHelper;
    private final Clock clock;

    public StockQueryService(
            StockLotRepository stockLotRepository,
            StockMovementRepository stockMovementRepository,
            SecurityContextHelper securityContextHelper,
            Clock clock) {
        this.stockLotRepository = stockLotRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.securityContextHelper = securityContextHelper;
        this.clock = clock;
    }

    /** {@inheritDoc} */
    @Override
    @Transactional(readOnly = true)
    public Page<StockProductSummaryDto> listProductSummaries(
            String search, Long branchId, boolean expiringSoon, Pageable pageable) {
        Long effectiveBranchId = resolveBranchForUser(branchId);
        LocalDate expiringSoonLimit = LocalDate.now(clock).plusDays(EXPIRING_SOON_DAYS);
        return stockLotRepository.searchProductSummaries(
                buildSearchPattern(search),
                effectiveBranchId,
                expiringSoon,
                expiringSoonLimit,
                mapProductSort(pageable));
    }

    /** {@inheritDoc} */
    @Override
    @Transactional(readOnly = true)
    public Page<StockLotDto> listLots(
            String search, Long productId, Long branchId, boolean expiringSoon, Pageable pageable) {
        Long effectiveBranchId = resolveBranchForUser(branchId);
        LocalDate expiringSoonLimit = LocalDate.now(clock).plusDays(EXPIRING_SOON_DAYS);
        return stockLotRepository
                .searchLots(
                        buildSearchPattern(search),
                        productId,
                        effectiveBranchId,
                        expiringSoon,
                        expiringSoonLimit,
                        mapSort(pageable))
                .map(lot -> toDto(lot, null));
    }

    /** {@inheritDoc} */
    @Override
    @Transactional(readOnly = true)
    public Page<StockMovementDto> listMovements(
            StockMovementType type,
            Long productId,
            Long branchId,
            String search,
            LocalDate from,
            LocalDate to,
            Pageable pageable) {
        Long effectiveBranchId = resolveBranchForUser(branchId);
        OffsetDateTime fromDate =
                from == null ? null : from.atStartOfDay(ZoneOffset.UTC).toOffsetDateTime();
        OffsetDateTime toDate = to == null ? null : to.atTime(LocalTime.MAX).atOffset(ZoneOffset.UTC);
        return stockMovementRepository
                .findAll(
                        movementSearchSpec(
                                type, productId, effectiveBranchId, buildSearchPattern(search), fromDate, toDate),
                        mapMovementSort(pageable))
                .map(this::toMovementDto);
    }

    /** {@inheritDoc} */
    @Override
    @Transactional(readOnly = true)
    public BigDecimal calculateAvailableQuantity(Long productId, Long branchId) {
        return stockLotRepository.calculateAvailableQuantity(productId, branchId);
    }

    /** {@inheritDoc} */
    @Override
    @Transactional(readOnly = true)
    public Map<Long, BigDecimal> calculateAvailableQuantityByProductIds(Collection<Long> productIds, Long branchId) {
        if (productIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, BigDecimal> availability = new HashMap<>();
        for (Object[] row : stockLotRepository.calculateAvailableQuantityByProductIds(productIds, branchId)) {
            availability.put((Long) row[0], (BigDecimal) row[1]);
        }
        return availability;
    }

    private Specification<StockMovement> movementSearchSpec(
            StockMovementType type,
            Long productId,
            Long branchId,
            String searchPattern,
            OffsetDateTime fromDate,
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
                predicates.add(criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("product").get("name")), searchPattern));
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

    private Pageable mapProductSort(Pageable pageable) {
        if (pageable.getSort().isUnsorted()) {
            return pageable;
        }
        Sort mappedSort = Sort.unsorted();
        for (Sort.Order order : pageable.getSort()) {
            String property =
                    switch (order.getProperty()) {
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

    private Pageable mapMovementSort(Pageable pageable) {
        if (pageable.getSort().isUnsorted()) {
            return pageable;
        }
        Sort mappedSort = Sort.unsorted();
        for (Sort.Order order : pageable.getSort()) {
            String property =
                    switch (order.getProperty()) {
                        case "productName" -> "product.name";
                        case "branchName" -> "branch.name";
                        case "type", "createdAt", "quantity", "reason" -> order.getProperty();
                        default -> null;
                    };
            if (property == null) {
                return PageRequest.of(
                        pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Direction.DESC, "createdAt"));
            }
            mappedSort = mappedSort.and(Sort.by(new Sort.Order(order.getDirection(), property)));
        }
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), mappedSort);
    }

    private Pageable mapSort(Pageable pageable) {
        if (pageable.getSort().isUnsorted()) {
            return pageable;
        }
        Sort mappedSort = Sort.unsorted();
        for (Sort.Order order : pageable.getSort()) {
            String property =
                    switch (order.getProperty()) {
                        case "productName" -> "product.name";
                        case "branchName" -> "branch.name";
                        default -> order.getProperty();
                    };
            mappedSort = mappedSort.and(Sort.by(new Sort.Order(order.getDirection(), property)));
        }
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), mappedSort);
    }

    private StockMovementDto toMovementDto(StockMovement movement) {
        return new StockMovementDto(
                movement.getId(),
                movement.getStockLot().getId(),
                movement.getProduct().getId(),
                movement.getProduct().getName(),
                movement.getBranch().getId(),
                movement.getBranch().getName(),
                movement.getType().name(),
                movement.getQuantity(),
                movement.getUnitCostSnapshot(),
                movement.getReason(),
                movement.getCreatedByUserId(),
                movement.getCreatedAt());
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
        // Unit-level callers without a security context retain explicit branch behavior.
        if (currentUser == null || currentUser.getRole() == Role.ADMIN) {
            return requestedBranchId;
        }
        if (currentUser.getBranchId() == null) {
            throw new DomainException("INVALID_USER_BRANCH", HttpStatus.BAD_REQUEST, "User has no assigned branch");
        }
        return currentUser.getBranchId();
    }

    private String buildSearchPattern(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return "%" + value.trim().toLowerCase() + "%";
    }
}
