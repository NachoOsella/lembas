import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../../core/services/auth';

/**
 * Lightweight shell for authenticated customer routes.
 *
 * <p>Replaces the public {@link StoreLayout} on `/customer/**` so the
 * customer-facing flow does not pay the cost of the public store nav:
 * sticky backdrop-blur, branch selector, search bar, hero flowers, or the
 * floating cart CTA. The customer layout is a flat header, a content
 * outlet, and a small footer with legal links.</p>
 */
@Component({
  selector: 'app-customer-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './customer-layout.html',
  styleUrl: './customer-layout.css',
})
export class CustomerLayout implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly userDisplayName = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return '';
    if (user.firstName) return user.firstName;
    return user.email;
  });

  protected readonly copyright = `\u00a9 ${new Date().getFullYear()} Lembas`;

  ngOnInit(): void {
    // Make sure the auth state is hydrated before the layout renders.
    this.auth.ensureSession().subscribe();
  }

  /** Logs the customer out and returns them to the public store. */
  protected logout(): void {
    this.auth.logout().subscribe({
      complete: () => this.router.navigate(['/store']),
    });
  }
}
