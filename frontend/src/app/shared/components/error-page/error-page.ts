import { Component, computed, inject, input } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

/**
 * Error page component for displaying 403, 404 and 500 errors.
 *
 * Follows the Lembas design system with warm cream backgrounds, decorative blurred blobs,
 * tight tracking typography, and pill buttons matching the home page aesthetic.
 *
 * Usage in routes:
 * ```typescript
 * { path: 'error/403', component: ErrorPage, data: { errorCode: '403' } }
 * { path: 'error/404', component: ErrorPage, data: { errorCode: '404' } }
 * { path: 'error/500', component: ErrorPage, data: { errorCode: '500' } }
 * ```
 */
@Component({
  selector: 'app-error-page',
  imports: [RouterLink],
  template: `
    <div class="error-page">
      <div class="error-container">
        <!-- Error code display -->
        <div class="error-code-wrapper">
          <span class="error-code">{{ errorCode() }}</span>
        </div>

        <!-- Main content -->
        <div class="error-content">
          <h1 class="error-title">{{ title() }}</h1>
          <p class="error-message">{{ message() }}</p>

          <!-- Action buttons -->
          <div class="error-actions">
            <a [routerLink]="primaryRoute()" class="btn-primary">
              {{ primaryLabel() }}
            </a>
            <a routerLink="/store" class="btn-secondary"> Ir al inicio </a>
          </div>
        </div>

        <!-- Helpful suggestions -->
        @if (errorCode() === '404') {
          <div class="suggestions-section">
            <p class="suggestions-label">¿Qué podés hacer?</p>
            <div class="suggestions-grid">
              @for (suggestion of suggestions; track suggestion.title) {
                <a [routerLink]="suggestion.route" class="suggestion-card">
                  <div class="suggestion-icon">
                    <i [class]="suggestion.icon"></i>
                  </div>
                  <div class="suggestion-content">
                    <h3 class="suggestion-title">{{ suggestion.title }}</h3>
                    <p class="suggestion-description">{{ suggestion.description }}</p>
                  </div>
                </a>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    .error-page {
      min-height: calc(100vh - 200px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem 1.5rem;
      background: #f6ead6;
      animation: fadeIn 0.6s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .error-container {
      max-width: 800px;
      width: 100%;
      text-align: center;
    }

    .error-code-wrapper {
      margin-bottom: 2rem;
    }

    .error-code {
      font-size: 8rem;
      font-weight: 800;
      line-height: 1;
      color: #2f8d72;
      letter-spacing: -0.04em;
      animation: slideDown 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .error-content {
      margin-bottom: 3rem;
    }

    .error-title {
      font-size: 2.5rem;
      font-weight: 700;
      color: rgba(0, 0, 0, 0.87);
      margin: 0 0 1rem 0;
      letter-spacing: -0.02em;
      animation: fadeIn 0.8s ease-out 0.2s both;
    }

    .error-message {
      font-size: 1.125rem;
      line-height: 1.6;
      color: rgba(0, 0, 0, 0.58);
      margin: 0 auto 2rem auto;
      max-width: 600px;
      animation: fadeIn 0.8s ease-out 0.3s both;
    }

    .error-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
      animation: fadeIn 0.8s ease-out 0.4s both;
    }

    .btn-primary,
    .btn-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.875rem 2rem;
      font-size: 1rem;
      font-weight: 600;
      text-decoration: none;
      border-radius: 50px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      border: none;
    }

    .btn-primary {
      background: #2f8d72;
      color: white;
      box-shadow:
        0 0 0.5px rgba(47, 141, 114, 0.12),
        0 1px 2px rgba(47, 141, 114, 0.14);
    }

    .btn-primary:hover {
      background: #075f36;
    }

    .btn-primary:active {
      transform: scale(0.95);
    }

    .btn-secondary {
      background: white;
      color: #2f8d72;
      border: 2px solid #2f8d72;
    }

    .btn-secondary:hover {
      background: #2f8d72;
      color: white;
    }

    .btn-secondary:active {
      transform: scale(0.95);
    }

    .suggestions-section {
      margin-top: 4rem;
      padding-top: 3rem;
      border-top: 1px solid rgba(47, 141, 114, 0.1);
      animation: fadeIn 0.8s ease-out 0.5s both;
    }

    .suggestions-label {
      font-size: 1.125rem;
      font-weight: 600;
      color: rgba(0, 0, 0, 0.87);
      margin: 0 0 1.5rem 0;
    }

    .suggestions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-top: 1.5rem;
    }

    .suggestion-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 1.5rem;
      background: white;
      border-radius: 12px;
      text-decoration: none;
      transition: all 0.2s ease;
      border: 1px solid rgba(47, 141, 114, 0.08);
      box-shadow:
        0 0 0.5px rgba(0, 0, 0, 0.14),
        0 1px 1px rgba(0, 0, 0, 0.24);
    }

    .suggestion-card:hover {
      border-color: rgba(47, 141, 114, 0.2);
    }

    .suggestion-card:active {
      transform: scale(0.98);
    }

    .suggestion-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(47, 141, 114, 0.1);
      border-radius: 12px;
      margin-bottom: 1rem;
      transition: all 0.3s ease;
    }

    .suggestion-icon i {
      font-size: 1.5rem;
      color: #2f8d72;
    }

    .suggestion-card:hover .suggestion-icon {
      background: #2f8d72;
    }

    .suggestion-card:hover .suggestion-icon i {
      color: white;
    }

    .suggestion-content {
      text-align: left;
    }

    .suggestion-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: rgba(0, 0, 0, 0.87);
      margin: 0 0 0.5rem 0;
    }

    .suggestion-description {
      font-size: 0.9375rem;
      line-height: 1.5;
      color: rgba(0, 0, 0, 0.58);
      margin: 0;
    }

    @media (max-width: 640px) {
      .error-code {
        font-size: 5rem;
      }

      .error-title {
        font-size: 2rem;
      }

      .error-message {
        font-size: 1rem;
      }

      .error-actions {
        flex-direction: column;
      }

      .btn-primary,
      .btn-secondary {
        width: 100%;
      }

      .suggestions-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class ErrorPage {
  private readonly route = inject(ActivatedRoute);

  /**
   * Error code from route data (if navigated via router).
   */
  private readonly routeErrorCode = toSignal(
    this.route.data.pipe(map((data) => (data['errorCode'] as string) ?? null)),
    { initialValue: null },
  );

  /**
   * Error code input (if used directly in template).
   * Takes precedence over route data.
   */
  readonly errorCodeInput = input<'403' | '404' | '500' | null>(null);

  /**
   * Final error code: input takes precedence, then route data, then defaults to 404.
   */
  readonly errorCode = computed<'403' | '404' | '500'>(() => {
    return this.errorCodeInput() ?? (this.routeErrorCode() as '403' | '404' | '500') ?? '404';
  });

  /**
   * Computed title based on error code.
   */
  protected readonly title = computed(() => {
    switch (this.errorCode()) {
      case '403':
        return 'No tenés permiso para acceder';
      case '404':
        return 'No encontramos esta página';
      case '500':
        return 'Algo salió mal';
    }
  });

  /**
   * Computed message based on error code.
   */
  protected readonly message = computed(() => {
    switch (this.errorCode()) {
      case '403':
        return 'No tenés los permisos necesarios para ver esta página. Volvé al inicio o contactá al administrador.';
      case '404':
        return 'La página que buscás no existe o fue movida. Explorá nuestro catálogo para encontrar productos saludables.';
      case '500':
        return 'Tuvimos un problema inesperado. Intentá nuevamente en unos minutos.';
    }
  });

  /**
   * Primary action route based on error type.
   */
  protected readonly primaryRoute = computed(() => {
    return this.errorCode() === '404' ? '/store/products' : '/store';
  });

  /**
   * Primary action label based on error type.
   */
  protected readonly primaryLabel = computed(() => {
    return this.errorCode() === '404' ? 'Explorar catálogo' : 'Volver al inicio';
  });

  /**
   * Helpful suggestions for 404 errors.
   */
  protected readonly suggestions = [
    {
      icon: 'pi pi-shopping-bag',
      title: 'Ver catálogo',
      description: 'Explorá todos nuestros productos saludables.',
      route: '/store/products',
    },
    {
      icon: 'pi pi-home',
      title: 'Ir al inicio',
      description: 'Volvé a la página principal de la tienda.',
      route: '/store',
    },
    {
      icon: 'pi pi-user',
      title: 'Mi cuenta',
      description: 'Accedé a tu perfil y pedidos anteriores.',
      route: '/customer/profile',
    },
  ];
}
