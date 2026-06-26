import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MessageService } from 'primeng/api';

import { CashService } from '../../../../core/services/cash';
import { ErrorMappingService } from '../../../../core/services/error-mapping';
import { getApiError } from '../../../../shared/models/api-error';
import { CashSessionDto } from '../../../../shared/models/cash-session';

import { AppButton } from '../../../../shared/components/app-button/app-button';
import { AppPageHeader } from '../../../../shared/components/app-page-header/app-page-header';
import { AppToast } from '../../../../shared/components/app-toast/app-toast';
import { ErrorAlert } from '../../../../shared/components/error-alert/error-alert';

/**
 * Minimal cash detail screen (S3-US06).
 *
 * Shows the data of an open cash session (the result of an open or current
 * redirect). Close/movements are added by later stories; this screen only
 * renders the session state read-only.
 */
@Component({
  selector: 'app-cash-detail',
  imports: [AppButton, AppPageHeader, AppToast, ErrorAlert, CurrencyPipe, DatePipe],
  templateUrl: './cash-detail.html',
  styleUrl: './cash-detail.css',
})
export class CashDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cashService = inject(CashService);
  private readonly messageService = inject(MessageService);
  private readonly errorMapping = inject(ErrorMappingService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly session = signal<CashSessionDto | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.loading.set(false);
      this.errorMessage.set('Identificador de caja invalido.');
      return;
    }
    this.cashService.getById(id).subscribe({
      next: (session) => {
        this.session.set(session);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const apiError = getApiError(err);
        this.errorMessage.set(
          apiError
            ? this.errorMapping.getMessage(apiError.code, apiError.message)
            : 'No se pudo cargar la caja.',
        );
      },
    });
  }

  /** Returns to the cash landing; the sidebar badge reflects the open session. */
  protected goBack(): void {
    void this.router.navigate(['/admin/cash']);
  }
}
