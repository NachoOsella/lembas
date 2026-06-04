package com.dietetica.lembas.inventory.service;

import com.dietetica.lembas.inventory.dto.StockLotResponse;
import com.dietetica.lembas.inventory.model.StockLot;
import com.dietetica.lembas.inventory.repository.StockLotRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;

/** Application service for admin stock lot queries and availability calculations. */
@Service
public class StockLotService {

    private static final int EXPIRING_SOON_DAYS = 30;

    private final StockLotRepository stockLotRepository;
    private final Clock clock;

    public StockLotService(StockLotRepository stockLotRepository, Clock clock) {
        this.stockLotRepository = stockLotRepository;
        this.clock = clock;
    }

    /** Lists stock lots with optional filters for the admin inventory table. */
    @Transactional(readOnly = true)
    public Page<StockLotResponse> listLots(Long productId, Long branchId, boolean expiringSoon, Pageable pageable) {
        LocalDate expiringSoonLimit = LocalDate.now(clock).plusDays(EXPIRING_SOON_DAYS);
        return stockLotRepository.searchLots(productId, branchId, expiringSoon, expiringSoonLimit, mapSort(pageable))
                .map(this::toResponse);
    }

    /** Calculates available stock from stock_lots without using a denormalized cache. */
    @Transactional(readOnly = true)
    public BigDecimal calculateAvailableQuantity(Long productId, Long branchId) {
        return stockLotRepository.calculateAvailableQuantity(productId, branchId);
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
    private StockLotResponse toResponse(StockLot lot) {
        return new StockLotResponse(
                lot.getId(),
                lot.getProduct().getId(),
                lot.getProduct().getName(),
                lot.getBranch().getId(),
                lot.getBranch().getName(),
                lot.getQuantityAvailable(),
                lot.getLotCode(),
                lot.getExpirationDate(),
                lot.getCostPrice()
        );
    }
}
