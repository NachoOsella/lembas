import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

/** Response from POST /api/customer/orders/{id}/payments/preference. */
export interface CreatePreferenceResponse {
  readonly paymentId: number;
  readonly preferenceId: string;
  readonly initPoint: string;
}

/**
 * Customer-facing service that creates a Mercado Pago Checkout Pro preference
 * for an online order and exposes the URL the customer should be redirected to.
 *
 * <p>The response from the backend is the canonical source of truth; the
 * service is a thin pass-through to keep the calling code free of HTTP
 * concerns. Side-effects (toast notifications, redirects) are handled by the
 * consuming component.</p>
 */
@Injectable({ providedIn: 'root' })
export class CustomerCheckoutService {
  private readonly http = inject(HttpClient);

  /** Returns the preference id and the URL the customer should be sent to. */
  createPreference(orderId: number): Observable<CreatePreferenceResponse> {
    return this.http.post<CreatePreferenceResponse>(
      `/api/customer/orders/${orderId}/payments/preference`,
      {},
    );
  }
}
