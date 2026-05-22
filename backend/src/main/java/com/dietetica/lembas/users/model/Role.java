package com.dietetica.lembas.users.model;

/**
 * System roles for the Lembas application.
 *
 * <ul>
 *   <li><b>ADMIN</b> - Global access to all modules and branches.</li>
 *   <li><b>MANAGER</b> - Branch-level management access.</li>
 *   <li><b>EMPLOYEE</b> - Branch-level operative access (POS, stock).</li>
 *   <li><b>CUSTOMER</b> - Online store customer without internal access.</li>
 * </ul>
 */
public enum Role {
    ADMIN,
    MANAGER,
    EMPLOYEE,
    CUSTOMER
}
