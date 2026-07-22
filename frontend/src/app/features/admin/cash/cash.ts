import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import type { OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '@core/services/auth';
import { CashService } from '@features/cash/data-access/cash';

/** Cash landing redirect that resolves the employee's current open session. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-cash',
  imports: [],
  template: '',
})
export class Cash implements OnInit {
  private readonly cashService = inject(CashService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user && user.role !== 'CUSTOMER' && user.branchId != null && user.role !== 'ADMIN') {
      this.cashService
        .currentSession(user.branchId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (session) => void this.router.navigate(['/admin/cash', session.id]),
          error: () => void this.router.navigate(['/admin/cash/open']),
        });
      return;
    }
    void this.router.navigate(['/admin/cash/open']);
  }
}
