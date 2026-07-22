package com.dietetica.lembas.inventory.service;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Registers the framework-free FEFO policy for application and legacy consumers. */
@Configuration
public class FefoStockDeductionPolicyConfiguration {

    /** Creates the stateless FEFO policy used by inventory and temporary POS consumers. */
    @Bean
    public FefoStockDeductionPolicy fefoStockDeductionPolicy() {
        return new FefoStockDeductionPolicy();
    }
}
