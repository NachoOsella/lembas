import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';

import { CashService } from '../../../../core/services/cash';
import { AuthService } from '../../../../core/services/auth';
import { UserService } from '../../../../core/services/user';
import { ErrorMappingService } from '../../../../core/services/error-mapping';
import { getApiError } from '../../../../shared/models/api-error';
import { Branch } from '../../../../shared/models/user';
import { OpenCashSessionRequest } from '../../../../shared/models/cash-session';

import { AppBadge } from '../../../../shared/components/app-badge/app-badge';
import { AppButton } from '../../../../shared/components/app-button/app-button';
import { AppControlField } from '../../../../shared/components/app-control-field/app-control-field';
import { AppFormField } from '../../../../shared/components/app-form-field/app-form-field';
import { AppInputNumber } from '../../../../shared/components/app-input-number/app-input-number';
import { AppPageHeader } from '../../../../shared/components/app-page-header/app-page-header';
import { AppSelect } from '../../../../shared/components/app-select/app-select';
import { AppToast } from '../../../../shared/components/app-toast/app-toast';
import { ErrorAlert } from '../../../../shared/components/error-alert/error-alert';
import { LoadingSpinner } from '../../../../shared/components/loading-spinner/loading-spinner';
import { FormSection } from '../../../../shared/components/form-section/form-section';

interface BranchOption {
  readonly label: string;
  readonly value: number;
}

/**
 * Cash opening screen (S3-US06).
 *
 * Lets an internal employee open a cash register for a branch. MANAGER/EMPLOYEE
 * always operate on their assigned branch (read-only badge); ADMIN picks the
 * branch from a dropdown (auto-selected when only one active branch exists).
 *
 * On init it checks whether a session is already open for the resolved branch:
 * if so, it shows a toast and redirects to the existing cash detail (subtask 09).
 * On a successful open it redirects to the new cash detail (subtask 10).
 */
@Component({
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
    LoadingSpinner,
    FormSection,
    FormsModule,
  ],
  templateUrl: './cash-open.html',
  styleUrl: './cash-open.css',
})
export class CashOpen implements OnInit {
  private readonly cashService = inject(CashService);
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly errorMapping = inject(ErrorMappingService);

  protected readonly loading = signal(true);
  protected readonly loadingBranches = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /** Selected branch id. For ADMIN this is editable; for non-admin it is read-only. */
  protected readonly branchId = signal<number | null>(null);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly openingCashAmount = signal<number | null>(null);
  protected readonly openingNotes = signal('');

  protected readonly role = this.auth.getUserRole();

  /** ADMIN must select a branch; MANAGER/EMPLOYEE always use their assigned branch. */
  protected readonly isAdmin = computed(() => this.role === 'ADMIN');

  protected readonly branchOptions = computed<BranchOption[]>(() =>
    this.branches().map((b) => ({ label: b.name, value: b.id })),
  );

  /** Resolved branch label shown next to the form for MANAGER/EMPLOYEE. */
  protected readonly resolvedBranchName = computed(() => {
    if (this.isAdmin()) {
      const selected = this.branches().find((b) => b.id === this.branchId());
      return selected?.name ?? null;
    }
    return this.auth.currentUser()?.branchName ?? null;
  });



  /** True when the form is ready to be shown (branch resolved + no open session). */
  protected readonly formReady = computed(() => this.branchId() != null);

  /** Submit is enabled when a branch is resolved and the opening amount is set. */
  protected readonly canSubmit = computed(
    () => this.formReady() && this.openingCashAmount() != null && !this.saving() && !this.loading(),
  );

  /** Quick-set amount chips to speed up the most common opening balances. */
  protected readonly quickAmounts: ReadonlyArray<{
    readonly value: number;
    readonly label: string;
  }> = [
    { value: 5000, label: '5.000' },
    { value: 10000, label: '10.000' },
    { value: 20000, label: '20.000' },
    { value: 50000, label: '50.000' },
  ];

  ngOnInit(): void {
    this.initialize();
  }

  /** Loads branches (ADMIN) or derives the branch (MANAGER/EMPLOYEE) and checks for an open session. */
  private initialize(): void {
    const user = this.auth.currentUser();
    if (!user || user.role === 'CUSTOMER') {
      void this.router.navigate(['/admin']);
      return;
    }

    if (this.isAdmin()) {
      this.loadBranches();
      return;
    }

    if (user.branchId == null) {
      this.loading.set(false);
      this.errorMessage.set(this.errorMapping.getMessage('INVALID_USER_BRANCH'));
      return;
    }

    this.branchId.set(user.branchId);
    this.checkOpenSession(user.branchId);
  }

  /** Loads active branches and, when only one exists, auto-selects it; then checks for an open session. */
  private loadBranches(): void {
    this.loadingBranches.set(true);
    this.userService.listBranches().subscribe({
      next: (branches) => {
        this.branches.set(branches);
        this.loadingBranches.set(false);
        if (branches.length === 1) {
          this.branchId.set(branches[0].id);
          this.checkOpenSession(branches[0].id);
        } else {
          this.loading.set(false);
        }
      },
      error: (err) => {
        this.loadingBranches.set(false);
        this.loading.set(false);
        this.errorMessage.set(this.messageForError(err, 'No se pudieron cargar las sucursales.'));
      },
    });
  }

  /** Triggered when ADMIN selects a branch: validate non-duplicate-open before rendering the form. */
  protected onBranchSelected(value: number | null): void {
    this.branchId.set(value);
    if (value != null) {
      this.checkOpenSession(value);
    }
  }

  /** Applies a quick-amount chip value to the opening amount. */
  protected applyQuickAmount(value: number): void {
    this.openingCashAmount.set(value);
  }

  /** Asks the backend for the current OPEN session; if it exists, redirects to its detail. */
  private checkOpenSession(branchId: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.cashService.currentSession(branchId).subscribe({
      next: (session) => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'info',
          summary: 'Caja ya abierta',
          detail: 'Te llevamos al detalle de la caja abierta.',
        });
        void this.router.navigate(['/admin/cash', session.id]);
      },
      error: (err) => {
        this.loading.set(false);
        const apiError = getApiError(err);
        // CASH_SESSION_NOT_FOUND is the expected "no open session" path: show the form.
        if (!apiError || apiError.code === 'CASH_SESSION_NOT_FOUND') {
          return;
        }
        if (apiError.code === 'CASH_BRANCH_REQUIRED') {
          // ADMIN without selection: keep the form to let them pick.
          return;
        }
        this.errorMessage.set(
          this.messageForError(err, 'No se pudo verificar el estado de la caja.'),
        );
      },
    });
  }

  /** Submits the open request and redirects to the new cash detail on success. */
  protected submit(): void {
    const branchId = this.branchId();
    const amount = this.openingCashAmount();
    if (branchId == null || amount == null) {
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);

    const request: OpenCashSessionRequest = {
      openingCashAmount: amount.toFixed(2),
      openingNotes: this.openingNotes().trim() || null,
      branchId: this.isAdmin() ? branchId : null,
    };

    this.cashService.openSession(request).subscribe({
      next: (session) => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Caja abierta',
          detail: 'La caja fue abierta correctamente.',
        });
        void this.router.navigate(['/admin/cash', session.id]);
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(this.messageForError(err, 'No se pudo abrir la caja.'));
      },
    });
  }

  /** Maps backend API errors to Spanish copy, falling back to a provided message. */
  private messageForError(error: unknown, fallback: string): string {
    const apiError = getApiError(error);
    if (!apiError) {
      return fallback;
    }
    if (apiError.code === 'VALIDATION_ERROR') {
      return this.errorMapping.formatValidationErrors(apiError);
    }
    return this.errorMapping.getMessage(apiError.code, apiError.message);
  }
}
