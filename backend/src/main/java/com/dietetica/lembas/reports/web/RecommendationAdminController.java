package com.dietetica.lembas.reports.web;

import com.dietetica.lembas.reports.dto.RecommendationDto;
import com.dietetica.lembas.reports.service.RecommendationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST endpoints that power the recommendations page and the dashboard mini
 * panel (S4-US06).
 */
@RestController
@RequestMapping("/api/admin/recommendations")
public class RecommendationAdminController {

    private final RecommendationService recommendationService;

    public RecommendationAdminController(RecommendationService recommendationService) {
        this.recommendationService = recommendationService;
    }

    /**
     * Lists recommendations filtered by type, minimum urgency and product.
     *
     * <p>Pass {@code limit} (e.g. {@code 5}) for the dashboard mini panel to
     * show only the most urgent items; omit it for the full recommendations
     * page.</p>
     */
    @GetMapping
    public List<RecommendationDto> getRecommendations(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String minUrgency,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) Integer limit
    ) {
        return recommendationService.getRecommendations(branchId, minUrgency, type, productId, limit);
    }
}
