import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MessageService } from 'primeng/api';

import { CashService } from '../../../../core/services/cash';
import { ErrorMappingService } from '../../../../core/services/error-mapping';
import { getApiError } from '../../../../shared/models/api-error';
import { CashSessionDto, CashMovementDto } from '../../../../shared/models/cash-session';

import { AppButton } from '../../../../shared/components/app-button/app-button';
import { AppPageHeader } from '../../../../shared/components/app-page-header/app-page-header';
import { AppToast } from '../../../../shared/components/app-toast/app-toast';
import { ErrorAlert } from '../../../../shared/components/error-alert/error-alert';
import { MovementForm } from '../movement-form/movement-form';
import {
  SeverityPill,
  SeverityPillTone,
} from '../../../../shared/components/severity-pill/severity-pill';

/**
 * Cash detail screen with movements table and movement form (S3-US07).
 */
@Component({
  selector: 'app-cash-detail',
  imports: [
    AppButton,
    AppPageHeader,
    AppToast,
    ErrorAlert,
    MovementForm,
    SeverityPill,
    CurrencyPipe,
    DatePipe,
  ],
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
  protected readonly movements = signal<CashMovementDto[]>([]);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.loading.set(false);
      this.errorMessage.set('Identificador de caja invalido.');
      return;
    }
    this.loadSession(id);
  }

  private loadSession(id: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.cashService.getById(id).subscribe({
      next: (session) => {
        this.session.set(session);
        this.movements.set(session.movements ?? []);
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

  /** Reloads the session after a movement is added. */
  protected onMovementAdded(): void {
    const id = this.session()?.id;
    if (id != null) {
      this.loadSession(id);
    }
  }

  /** Tone for the movement type badge. */
  protected movementTone(type: string): SeverityPillTone {
    switch (type) {
      case 'CASH_IN':
        return 'success';
      case 'CASH_OUT':
        return 'danger';
      case 'ADJUSTMENT':
        return 'warn';
      default:
        return 'neutral';
    }
  }

  /** Label for the movement type badge. */
  protected movementLabel(type: string): string {
    switch (type) {
      case 'CASH_IN':
        return 'Ingreso';
      case 'CASH_OUT':
        return 'Egreso';
      case 'ADJUSTMENT':
        return 'Ajuste';
      default:
        return type;
    }
  }

  /** The form is disabled when the session is closed. */
  protected get isClosed(): boolean {
    return this.session()?.status === 'CLOSED';
  }

  protected goBack(): void {
    void this.router.navigate(['/admin/cash']);
  }
}
