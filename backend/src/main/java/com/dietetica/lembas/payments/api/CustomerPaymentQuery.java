package com.dietetica.lembas.payments.api;

import com.dietetica.lembas.payments.dto.PaymentSummaryDto;
import java.util.List;

/** Narrow payment-history query exposed to the customer payment controller. */
public interface CustomerPaymentQuery {

    /** Returns payment summaries owned by the customer for the requested order. */
    List<PaymentSummaryDto> findForCustomerOrder(Long orderId, Long customerUserId);
}
