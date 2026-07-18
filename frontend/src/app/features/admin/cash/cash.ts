import type { OnInit } from '@angular/core';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { CashService } from '@features/cash/data-access/cash';
import { AuthService } from '@core/services/auth';

/**
 * Cash landing screen.
 *
 * Resolves the current open session for the user's branch and redirects:
 * - to {@code /admin/cash/:id} when an open session exists.
 * - to {@code /admin/cash/open} when no open session exists.
 *
 * ADMIN without a selected branch is sent straight to the open form, where the
 * branch dropdown is shown.
 */
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
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user && user.role !== 'CUSTOMER' && user.branchId != null && user.role !== 'ADMIN') {
      this.cashService.currentSession(user.branchId).subscribe({
        next: (session) => {
          void this.router.navigate(['/admin/cash', session.id]);
        },
        error: () => {
          void this.router.navigate(['/admin/cash/open']);
        },
      });
      return;
    }
    void this.router.navigate(['/admin/cash/open']);
  }
}
