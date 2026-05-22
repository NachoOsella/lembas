import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly route = inject(ActivatedRoute);

  /** Whether the user has just completed registration and should see a success message. */
  readonly showRegistrationSuccess = computed(() => {
    return this.route.snapshot.queryParamMap.get('registered') === 'true';
  });
}
