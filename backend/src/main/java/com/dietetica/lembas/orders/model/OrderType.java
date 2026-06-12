package com.dietetica.lembas.orders.model;

/** Channel that created an order. */
public enum OrderType {
    /** In-store sale created by an employee (POS terminal). */
    POS,
    /** Online customer order from the public storefront. */
    ONLINE
}
