package com.dietetica.lembas.catalog.repository;

import com.dietetica.lembas.catalog.model.PricingRule;
import org.springframework.data.jpa.repository.JpaRepository;

/** Repository for pricing rules used by sale price suggestions. */
public interface PricingRuleRepository extends JpaRepository<PricingRule, Long> {
}
