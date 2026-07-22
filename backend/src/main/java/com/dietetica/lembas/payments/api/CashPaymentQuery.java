package com.dietetica.lembas.payments.api;

import com.dietetica.lembas.payments.model.Payment;
import java.util.List;

/** Narrow payment query exposed to the cash module for approved session payments. */
public interface CashPaymentQuery {

    /** Returns approved payments linked to a cash session in stable id order. */
    List<Payment> findApprovedForCashSession(Long cashSessionId);
}
