import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import type { OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { form, required, submit, validate } from '@angular/forms/signals';
import { MessageService } from 'primeng/api';

import { AuthService } from '@core/services/auth';
import { CashOpenPageStore } from '../state/cash-open-page.store';
import { parseCashAmount, toOpenCashSessionRequest } from '@features/cash/domain/cash-forms';
import type { CashOpenFormModel } from '@features/cash/domain/cash-forms';

import { AppBadge } from '@shared/components/app-badge/app-badge';
import { AppButton } from '@shared/components/app-button/app-button';
import { AppControlField } from '@shared/components/app-control-field/app-control-field';
import { AppFormField } from '@shared/components/app-form-field/app-form-field';
import { AppInputNumber } from '@shared/components/app-input-number/app-input-number';
import { AppPageHeader } from '@shared/components/app-page-header/app-page-header';
import { AppSelect } from '@shared/components/app-select/app-select';
import { AppToast } from '@shared/components/app-toast/app-toast';
import { ErrorAlert } from '@shared/components/error-alert/error-alert';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { LoadingSpinner } from '@shared/components/loading-spinner/loading-spinner';
import { FormSection } from '@shared/components/form-section/form-section';

interface BranchOption {
  readonly label: string;
  readonly value: number;
}

/** Cash opening page. Branch/session reads and command state live in its page store. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-cash-open',
  imports: [
    AppBadge,
    AppButton,
    AppControlField,
    AppFormField,
    AppInputNumber,
    AppPageHeader,
    AppSelect,
    AppToast,
    ErrorAlert,
    EmptyState,
    LoadingSpinner,
    FormSection,
    FormsModule,
  ],
  providers: [CashOpenPageStore],
  templateUrl: './cash-open.html',
  styleUrl: './cash-open.css',
})
export class CashOpen implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  protected readonly store = inject(CashOpenPageStore);
  protected readonly loading = this.store.loading;
  protected readonly saving = this.store.saving;
  protected readonly errorMessage = this.store.errorMessage;
  protected readonly branches = this.store.branches;
  protected readonly role = this.auth.getUserRole();
  protected readonly isAdmin = computed(() => this.role === 'ADMIN');

  /** Signal-form model keeps transport values typed and avoids nullable controls. */
  protected readonly openModel = signal<CashOpenFormModel>({
    openingCashAmount: '',
    openingNotes: '',
  });

  protected readonly openForm = form(this.openModel, (schema) => {
    required(schema.openingCashAmount, { message: 'El monto inicial es obligatorio.' });
    validate(schema.openingCashAmount, ({ value }) => {
      const amount = parseCashAmount(value());
      return amount !== null && amount >= 0
        ? undefined
        : { kind: 'invalidAmount', message: 'Ingresa un monto inicial valido.' };
    });
  });

  protected readonly branchOptions = computed<BranchOption[]>(() =>
    this.store.branches().map((branch) => ({ label: branch.name, value: branch.id })),
  );
  protected readonly resolvedBranchName = computed(() => {
    if (this.isAdmin()) {
      return (
        this.store.branches().find((branch) => branch.id === this.store.branchId())?.name ?? null
      );
    }
    return this.auth.currentUser()?.branchName ?? null;
  });
  protected readonly openingCashAmount = computed(() =>
    parseCashAmount(this.openModel().openingCashAmount),
  );
  protected readonly openingNotes = computed(() => this.openModel().openingNotes);
  protected readonly canSubmit = computed(
    () => this.store.hasReadyForm() && this.openForm().valid() && !this.store.saving(),
  );

  protected readonly quickAmounts: ReadonlyArray<{
    readonly value: number;
    readonly label: string;
  }> = [
    { value: 5000, label: '5.000' },
    { value: 10000, label: '10.000' },
    { value: 20000, label: '20.000' },
    { value: 50000, label: '50.000' },
  ];

  constructor() {
    effect(() => {
      const openedSession = this.store.openedSession();
      if (openedSession) {
        this.messageService.add({
          severity: 'success',
          summary: 'Caja abierta',
          detail: 'La caja fue abierta correctamente.',
        });
        void this.router.navigate(['/admin/cash', openedSession.id]);
        return;
      }

      const currentSession = this.store.session();
      if (currentSession) {
        void this.router.navigate(['/admin/cash', currentSession.id]);
      }
    });
  }

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user || user.role === 'CUSTOMER') {
      void this.router.navigate(['/admin']);
      return;
    }

    if (this.isAdmin()) {
      const rawBranchId = this.route.snapshot.queryParamMap.get('branchId');
      const parsedBranchId = rawBranchId ? Number(rawBranchId) : Number.NaN;
      const requestedBranchId =
        Number.isFinite(parsedBranchId) && parsedBranchId > 0 ? parsedBranchId : null;
      this.store.loadBranches(requestedBranchId);
      return;
    }

    this.store.selectAssignedBranch(user.branchId ?? null);
  }

  protected onBranchSelected(branchId: number | null): void {
    this.store.selectBranch(branchId);
  }

  protected setOpeningCashAmount(amount: number | null): void {
    this.openModel.update((model) => ({
      ...model,
      openingCashAmount: amount === null ? '' : String(amount),
    }));
  }

  protected setOpeningNotes(notes: string): void {
    this.openModel.update((model) => ({ ...model, openingNotes: notes }));
  }

  protected applyQuickAmount(value: number): void {
    this.setOpeningCashAmount(value);
  }

  protected retry(): void {
    this.store.retry();
  }

  protected submit(): void {
    if (!this.canSubmit()) {
      return;
    }

    submit(this.openForm, async () => {
      const branchId = this.store.branchId();
      if (branchId === null) {
        return;
      }
      const request = toOpenCashSessionRequest(this.openModel(), branchId, this.isAdmin());
      if (request) {
        this.store.openSession(request);
      }
    });
  }
}
