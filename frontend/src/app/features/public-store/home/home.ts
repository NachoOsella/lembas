import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CatalogService } from '../../../core/services/catalog';
import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppEyebrow } from '../../../shared/components/app-eyebrow/app-eyebrow';
import { CardBanner } from '../../../shared/components/app-card-banner/app-card-banner';
import { ProductGridSkeleton } from '../../../shared/components/product-grid-skeleton/product-grid-skeleton';
import { StoreProductCard } from '../../../shared/components/store-product-card/store-product-card';
import { HeroFlowers } from '../../../shared/components/hero-flowers/hero-flowers';
import { ProductSummary } from '../../../shared/models/product';

@Component({
  selector: 'app-home',
  imports: [RouterLink, AppButton, AppEyebrow, CardBanner, ProductGridSkeleton, StoreProductCard, HeroFlowers],
  template: `
    <div class="home-page min-h-screen overflow-hidden bg-canvas">
      <!-- Editorial hero with organic depth -->
      <header
        class="home-hero relative isolate overflow-hidden px-4 py-16 sm:px-6 md:py-24 lg:px-8"
      >
        <!-- Decorative organic shapes -->
        <div
          class="pointer-events-none absolute -right-20 -top-20 h-[500px] w-[500px] rounded-full bg-white/5 blur-3xl"
          aria-hidden="true"
        ></div>
        <div
          class="pointer-events-none absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        ></div>

        <!-- Decorative Lembas flowers -->
        <app-hero-flowers />

        <div
          class="relative mx-auto grid w-full max-w-[1600px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_0.85fr] lg:px-10"
        >
          <section class="w-full max-w-3xl min-w-0">
            <div class="home-reveal home-reveal--eyebrow">
              <app-eyebrow color="light">Dietetica Lembas</app-eyebrow>
            </div>

            <h1
              class="home-reveal home-reveal--title mt-8 max-w-[760px] text-5xl font-semibold leading-[1.2] tracking-[-0.01em] text-white sm:text-6xl lg:text-[5rem]"
            >
              Tu despensa natural, lista para retirar
            </h1>

            <p
              class="home-reveal home-reveal--copy mt-6 w-full max-w-[660px] text-base font-medium leading-7 text-white/80 sm:text-lg"
            >
              Productos saludables para comprar online y retirar en sucursal.
            </p>

            <div class="home-reveal home-reveal--cta mt-10 flex flex-col gap-3 sm:flex-row">
              <app-button
                variant="hero"
                size="lg"
                routerLink="/store/products"
                icon="pi pi-arrow-right"
              >
                Explorar catálogo
              </app-button>
            </div>
          </section>

          <aside class="home-ticket-stage hidden lg:block" aria-label="Resumen de compra">
            <div class="home-ticket relative ml-auto max-w-sm">
              <!-- Ticket body -->
              <div class="home-ticket__body relative overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
                <!-- Header -->
                <div class="border-b-2 border-dashed border-[rgba(7,95,54,0.12)] bg-mint-wash-pale px-6 py-5">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                      <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white">
                        <i class="pi pi-ticket text-base" aria-hidden="true"></i>
                      </div>
                      <div>
                        <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                          Dietética Lembas
                        </p>
                        <p class="text-xs font-bold text-text">Pedido Simple</p>
                      </div>
                    </div>
                    <div class="text-right">
                      <p class="text-[10px] text-[rgba(0,0,0,0.45)]">N°</p>
                      <p class="font-mono text-sm font-bold text-primary">#001</p>
                    </div>
                  </div>
                </div>

                <!-- Pickup badge -->
                <div class="flex justify-center border-b border-dashed border-[rgba(7,95,54,0.08)] py-3">
                  <span class="inline-flex items-center gap-1.5 rounded-full bg-primary-dark px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-white">
                    <i class="pi pi-map-marker text-[10px]" aria-hidden="true"></i>
                    Retiro en sucursal
                  </span>
                </div>

                <!-- Steps -->
                <div class="px-6 py-5">
                  <p class="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgba(0,0,0,0.45)]">
                    Cómo funciona
                  </p>
                  <ul class="space-y-4">
                    <li class="flex items-start gap-3">
                      <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint-wash text-primary">
                        <i class="pi pi-search text-xs" aria-hidden="true"></i>
                      </div>
                      <div class="flex-1 pt-0.5">
                        <p class="text-sm font-semibold text-text">Explorá</p>
                        <p class="text-xs text-text-muted">Navegá el catálogo y filtrá por categoría</p>
                      </div>
                    </li>
                    <li class="flex items-start gap-3">
                      <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint-wash text-primary">
                        <i class="pi pi-shopping-cart text-xs" aria-hidden="true"></i>
                      </div>
                      <div class="flex-1 pt-0.5">
                        <p class="text-sm font-semibold text-text">Armá tu pedido</p>
                        <p class="text-xs text-text-muted">Agregá productos y confirmá el pago</p>
                      </div>
                    </li>
                    <li class="flex items-start gap-3">
                      <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint-wash text-primary">
                        <i class="pi pi-box text-xs" aria-hidden="true"></i>
                      </div>
                      <div class="flex-1 pt-0.5">
                        <p class="text-sm font-semibold text-text">Retirá</p>
                        <p class="text-xs text-text-muted">Pasá a buscar sin filas ni esperas</p>
                      </div>
                    </li>
                  </ul>
                </div>

                <!-- Footer (barcode decorativo) -->
                <div class="border-t-2 border-dashed border-[rgba(7,95,54,0.12)] bg-mint-wash-pale px-6 py-4">
                  <div class="flex items-center justify-between">
                    <div class="home-barcode flex gap-0.5">
                      <div class="h-8 w-0.5 bg-[rgba(0,0,0,0.87)]"></div>
                      <div class="h-8 w-1 bg-[rgba(0,0,0,0.87)]"></div>
                      <div class="h-8 w-0.5 bg-[rgba(0,0,0,0.87)]"></div>
                      <div class="h-8 w-1.5 bg-[rgba(0,0,0,0.87)]"></div>
                      <div class="h-8 w-0.5 bg-[rgba(0,0,0,0.87)]"></div>
                      <div class="h-8 w-1 bg-[rgba(0,0,0,0.87)]"></div>
                      <div class="h-8 w-0.5 bg-[rgba(0,0,0,0.87)]"></div>
                      <div class="h-8 w-1.5 bg-[rgba(0,0,0,0.87)]"></div>
                      <div class="h-8 w-0.5 bg-[rgba(0,0,0,0.87)]"></div>
                      <div class="h-8 w-1 bg-[rgba(0,0,0,0.87)]"></div>
                    </div>
                    <div class="text-right">
                      <p class="text-[9px] font-mono text-[rgba(0,0,0,0.45)]">LEMBAS-2026</p>
                      <p class="text-[9px] text-[rgba(0,0,0,0.35)]">dietetica.lembas</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main class="relative py-16 lg:py-24">
        <!-- Recommendations marquee -->
        <section
          class="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10"
          aria-labelledby="home-products-title"
        >
          <div class="home-section-reveal mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <app-eyebrow color="green">Seleccion curada</app-eyebrow>
              <h2
                id="home-products-title"
                class="mt-3 text-3xl font-semibold tracking-[-0.01em] sm:text-4xl"
              >
                Recomendados de la semana
              </h2>
            </div>
            <a
              routerLink="/store/products"
              class="inline-flex items-center gap-2 text-sm font-bold text-primary transition hover:text-primary-dark"
            >
              Ver catálogo completo <i class="pi pi-arrow-right" aria-hidden="true"></i>
            </a>
          </div>

          @if (featuredLoading()) {
            <div class="rounded-xl border border-[rgba(7,95,54,0.08)] bg-white p-5 shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]">
              <app-product-grid-skeleton [count]="6" />
            </div>
          } @else if (featuredProducts().length > 0) {
            <div
              class="home-marquee home-surface-reveal rounded-xl border border-[rgba(7,95,54,0.08)] bg-white p-5 shadow-[0_0_0.5px_rgba(0,0,0,0.14),0_1px_1px_rgba(0,0,0,0.24)]"
              aria-label="Productos recomendados en movimiento"
            >
              <div class="home-marquee__track">
                @for (product of featuredProducts(); track 'a-' + product.id) {
                  <app-store-product-card
                    [product]="product"
                    density="compact"
                    cardClass="home-product-card"
                  />
                }
                @for (product of featuredProducts(); track 'b-' + product.id) {
                  <app-store-product-card
                    [product]="product"
                    density="compact"
                    cardClass="home-product-card"
                  />
                }
              </div>
            </div>
          }
        </section>

        <!-- Benefits -->
        <section
          class="mx-auto mt-20 w-full max-w-[1600px] px-4 sm:px-6 lg:px-10"
          aria-labelledby="home-benefits-title"
        >
          <div class="mb-16 text-center">
            <app-eyebrow color="green">Comprá con confianza</app-eyebrow>
            <h2
              id="home-benefits-title"
              class="mt-4 text-3xl font-semibold tracking-[-0.01em] sm:text-4xl lg:text-5xl"
            >
              La experiencia Lembas, pensada para vos
            </h2>
          </div>

          <!-- Mobile: infinite marquee / Desktop: grid -->
          <div class="home-benefits-marquee -mx-4 sm:mx-0">
            <div class="home-benefits-marquee__track flex sm:grid sm:grid-cols-3 sm:gap-8">
              @for (benefit of benefits; track 'a-' + benefit.title) {
                <app-card-banner
                  borderRadius="12px"
                  padding="2rem"
                  [showBlob]="false"
                  [clickable]="true"
                  class="home-benefits-card home-card-rise"
                >
                  <div class="text-center">
                    <span
                      class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-mint-wash text-primary shadow-[0_0_0.5px_rgba(47,141,114,0.12),0_1px_2px_rgba(47,141,114,0.14)]"
                    >
                      <i [class]="benefit.icon + ' text-3xl'" aria-hidden="true"></i>
                    </span>
                    <h3 class="mt-6 text-xl font-bold tracking-[-0.01em] text-text">
                      {{ benefit.title }}
                    </h3>
                    <p class="mt-3 text-base leading-relaxed text-text-muted">
                      {{ benefit.description }}
                    </p>
                  </div>
                </app-card-banner>
              }
              @for (benefit of benefits; track 'b-' + benefit.title) {
                <app-card-banner
                  borderRadius="12px"
                  padding="2rem"
                  [showBlob]="false"
                  [clickable]="true"
                  class="home-benefits-card sm:hidden"
                  aria-hidden="true"
                >
                  <div class="text-center">
                    <span
                      class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-mint-wash text-primary shadow-[0_0_0.5px_rgba(47,141,114,0.12),0_1px_2px_rgba(47,141,114,0.14)]"
                    >
                      <i [class]="benefit.icon + ' text-3xl'" aria-hidden="true"></i>
                    </span>
                    <h3 class="mt-6 text-xl font-bold tracking-[-0.01em] text-text">
                      {{ benefit.title }}
                    </h3>
                    <p class="mt-3 text-base leading-relaxed text-text-muted">
                      {{ benefit.description }}
                    </p>
                  </div>
                </app-card-banner>
              }
            </div>
          </div>
        </section>

        <!-- Reviews -->
        <section
          class="mx-auto mt-20 w-full max-w-[1600px] px-4 sm:px-6 lg:px-10"
          aria-labelledby="home-reviews-title"
        >
          <div class="mb-16 text-center">
            <app-eyebrow color="green">Lo que dicen nuestros clientes</app-eyebrow>
            <h2
              id="home-reviews-title"
              class="mt-4 text-3xl font-semibold tracking-[-0.01em] sm:text-4xl lg:text-5xl"
            >
              Opiniones de la comunidad
            </h2>
            <!-- TODO: Replace mock reviews with real Google Maps / review platform data via API -->
            <div class="mt-6 flex items-center justify-center gap-3">
              <div class="flex gap-1">
                @for (star of [1, 2, 3, 4, 5]; track star) {
                  <i class="pi pi-star-fill text-primary text-lg" aria-hidden="true"></i>
                }
              </div>
              <span class="text-base font-bold text-text">4.8</span>
              <span class="text-sm text-[rgba(0,0,0,0.45)]">· 127 reseñas en Google</span>
            </div>
          </div>

          <!-- Mobile: infinite marquee / Desktop: grid -->
          <div class="home-reviews-marquee -mx-4 sm:mx-0">
            <div class="home-reviews-marquee__track flex sm:grid sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              @for (review of reviews; track 'a-' + review.name) {
                <app-card-banner
                  borderRadius="12px"
                  padding="1.5rem"
                  [showBlob]="false"
                  [clickable]="true"
                  class="home-reviews-card home-card-rise"
                >
                  <div class="flex items-center gap-4">
                    <span
                      class="flex h-12 w-12 items-center justify-center rounded-full bg-primary-dark text-base font-bold text-white shadow-[0_0_0.5px_rgba(7,95,54,0.12),0_1px_2px_rgba(7,95,54,0.14)]"
                    >
                      {{ review.name.charAt(0) }}
                    </span>
                    <div>
                      <p class="text-base font-bold text-text">{{ review.name }}</p>
                      <p class="text-xs text-[rgba(0,0,0,0.45)]">{{ review.date }}</p>
                    </div>
                  </div>
                  <div class="mt-4 flex gap-1">
                    @for (star of [1, 2, 3, 4, 5]; track star) {
                      <i
                        class="pi text-sm"
                        [class.pi-star-fill]="star <= review.rating"
                        [class.pi-star]="star > review.rating"
                        [class.text-primary]="star <= review.rating"
                        [class.text-[rgba(0,0,0,0.15)]]="star > review.rating"
                        aria-hidden="true"
                      ></i>
                    }
                  </div>
                  <p class="mt-4 text-base leading-relaxed text-text-muted">
                    "{{ review.text }}"
                  </p>
                </app-card-banner>
              }
              @for (review of reviews; track 'b-' + review.name) {
                <app-card-banner
                  borderRadius="12px"
                  padding="1.5rem"
                  [showBlob]="false"
                  [clickable]="true"
                  class="home-reviews-card sm:hidden"
                  aria-hidden="true"
                >
                  <div class="flex items-center gap-4">
                    <span
                      class="flex h-12 w-12 items-center justify-center rounded-full bg-primary-dark text-base font-bold text-white shadow-[0_0_0.5px_rgba(7,95,54,0.12),0_1px_2px_rgba(7,95,54,0.14)]"
                    >
                      {{ review.name.charAt(0) }}
                    </span>
                    <div>
                      <p class="text-base font-bold text-text">{{ review.name }}</p>
                      <p class="text-xs text-[rgba(0,0,0,0.45)]">{{ review.date }}</p>
                    </div>
                  </div>
                  <div class="mt-4 flex gap-1">
                    @for (star of [1, 2, 3, 4, 5]; track star) {
                      <i
                        class="pi text-sm"
                        [class.pi-star-fill]="star <= review.rating"
                        [class.pi-star]="star > review.rating"
                        [class.text-primary]="star <= review.rating"
                        [class.text-[rgba(0,0,0,0.15)]]="star > review.rating"
                        aria-hidden="true"
                      ></i>
                    }
                  </div>
                  <p class="mt-4 text-base leading-relaxed text-text-muted">
                    "{{ review.text }}"
                  </p>
                </app-card-banner>
              }
            </div>
          </div>
        </section>
      </main>
    </div>
  `,
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private readonly catalogService = inject(CatalogService);

  protected readonly featuredProducts = signal<ProductSummary[]>([]);
  protected readonly featuredLoading = signal(true);

  // ---------------------------------------------------------------------------
  // Benefits
  // ---------------------------------------------------------------------------
  protected readonly benefits = [
    {
      icon: 'pi pi-inbox',
      title: 'Retiro sin filas',
      description:
        'Armá tu pedido online y passá a buscar por sucursal cuando te quede cómodo.',
    },
    {
      icon: 'pi pi-verified',
      title: 'Productos curados',
      description:
        'Seleccionados por expertos en alimentación saludable y bienestar natural.',
    },
    {
      icon: 'pi pi-shield',
      title: 'Pago seguro',
      description:
        'Mercado Pago con todos los medios de pago. Tu información está protegida.',
    },
  ];

  // ---------------------------------------------------------------------------
  // Reviews (mock data)
  // ---------------------------------------------------------------------------
  // TODO: Replace with real Google Maps reviews via Places API or a review aggregator.
  protected readonly reviews = [
    {
      name: 'María González',
      date: this.formatReviewDate(-5),
      rating: 5,
      text:
        'Excelente variedad de productos naturales. El retiro en sucursal es super rápido y el personal siempre es amable.',
    },
    {
      name: 'Carlos Rodríguez',
      date: this.formatReviewDate(-12),
      rating: 5,
      text:
        'Me encanta poder armar el pedido desde casa y pasar a buscarlo. La granola artesanal es mi favorita.',
    },
    {
      name: 'Laura Martínez',
      date: this.formatReviewDate(-20),
      rating: 4,
      text:
        'Muy buena experiencia. Solo le pondría más opciones de bebidas, pero la calidad es incomparable.',
    },
    {
      name: 'Diego López',
      date: this.formatReviewDate(-3),
      rating: 5,
      text:
        'Compro todos los meses acá. Los suplementos son de primera y los precios son justos.',
    },
    {
      name: 'Ana Fernández',
      date: this.formatReviewDate(-30),
      rating: 5,
      text:
        'La mejor dietética de la zona. Productos que no conseguís en otro lado y un servicio impecable.',
    },
    {
      name: 'Martín Sánchez',
      date: this.formatReviewDate(-1),
      rating: 4,
      text:
        'Muy práctico el pedido online. El sitio es fácil de usar y los productos llegan en perfecto estado.',
    },
  ];

  ngOnInit(): void {
    this.catalogService.getFeaturedProducts().subscribe({
      next: (res) => {
        this.featuredProducts.set(res.content);
        this.featuredLoading.set(false);
      },
      error: () => this.featuredLoading.set(false),
    });
  }

  /** Formats a review date as DD-MM-YYYY relative to today. */
  private formatReviewDate(daysOffset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }
}
