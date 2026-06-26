package com.dietetica.lembas.cash.model;

/**
 * Lifecycle state of a cash register session.
 *
 * <p>A session is {@code OPEN} from the moment an employee opens the drawer
 * until it is closed; once closed it stays {@code CLOSED} forever (a new
 * session must be opened for the next shift).</p>
 *
 * @see com.dietetica.lembas.cash.model.CashSession
 */
public enum CashSessionStatus {
    OPEN,
    CLOSED
}