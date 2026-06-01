import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CatalogService } from '../../../core/services/catalog';
import { AppButton } from '../../../shared/components/app-button/app-button';
import { AppEyebrow } from '../../../shared/components/app-eyebrow/app-eyebrow';
import { ProductGridSkeleton } from '../../../shared/components/product-grid-skeleton/product-grid-skeleton';
import { StoreProductCard } from '../../../shared/components/store-product-card/store-product-card';
import { HeroFlowers } from '../../../shared/components/hero-flowers/hero-flowers';
import { ProductSummary } from '../../../shared/models/product';

@Component({
  selector: 'app-home',
  imports: [RouterLink, AppButton, AppEyebrow, ProductGridSkeleton, StoreProductCard, HeroFlowers],
  template: `
    <div class="home-page min-h-screen overflow-hidden bg-[#f6ead6] text-stone-950">
      <!-- Editorial hero with organic depth -->
      <header
        class="home-hero relative isolate overflow-hidden px-4 py-16 sm:px-6 md:py-24 lg:px-8"
      >
        <!-- Decorative organic shapes -->
        <div
          class="pointer-events-none absolute -right-20 -top-20 h-[500px] w-[500px] rounded-full bg-[#f29d52]/10 blur-3xl"
          aria-hidden="true"
        ></div>
        <div
          class="pointer-events-none absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-[#2f8d72]/10 blur-3xl"
          aria-hidden="true"
        ></div>

        <!-- Decorative Lembas flowers -->
        <app-hero-flowers />

        <div
          class="relative mx-auto grid w-full max-w-[1600px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_0.85fr] lg:px-10"
        >
          <section class="w-full max-w-3xl min-w-0">
            <app-eyebrow color="light">Dietetica Lembas</app-eyebrow>

            <h1
              class="mt-8 max-w-[760px] text-5xl font-semibold leading-[1.05] tracking-[-0.01em] text-white sm:text-6xl lg:text-[5rem]"
            >
              Tu despensa natural, lista para retirar
            </h1>

            <p
              class="mt-6 w-full max-w-[660px] text-base font-medium leading-7 text-white/80 sm:text-lg"
            >
              Productos saludables para comprar online y retirar en sucursal.
            </p>

            <div class="mt-10 flex flex-col gap-3 sm:flex-row">
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

          <aside class="hidden lg:block" aria-label="Resumen de compra">
            <div
              class="home-ticket relative ml-auto max-w-sm rounded-[2rem] border border-white/10 bg-white/95 p-7 shadow-2xl shadow-black/30 backdrop-blur-sm"
            >
              <div
                class="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#075f36]"
                aria-hidden="true"
              ></div>
              <div
                class="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#075f36]"
                aria-hidden="true"
              ></div>

              <div
                class="flex items-center justify-between border-b-2 border-dashed border-stone-300 pb-5"
              >
                <span class="text-[11px] font-bold uppercase tracking-[0.2em] text-black/58">
                  Pedido simple
                </span>
                <span
                  class="rounded-full bg-[#075f36] px-3 py-1 text-[11px] font-bold text-white tracking-wide"
                >
                  Pickup
                </span>
              </div>
              <ul class="mt-6 space-y-5 text-sm font-semibold text-stone-700">
                <li class="flex items-center gap-4">
                  <span
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d7eadf] text-[#2f8d72] font-bold text-sm"
                    >1</span
                  >
                  Explorá el catálogo y filtrá por categoría
                </li>
                <li class="flex items-center gap-4">
                  <span
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d7eadf] text-[#2f8d72] font-bold text-sm"
                    >2</span
                  >
                  Armá tu pedido y confirmá el pago
                </li>
                <li class="flex items-center gap-4">
                  <span
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d7eadf] text-[#2f8d72] font-bold text-sm"
                    >3</span
                  >
                  Retirá en sucursal sin filas
                </li>
              </ul>
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
          <div class="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <app-eyebrow color="green">Seleccion curada</app-eyebrow>
              <h2
                id="home-products-title"
                class="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl"
              >
                Recomendados de la semana
              </h2>
            </div>
            <a
              routerLink="/store/products"
              class="inline-flex items-center gap-2 text-sm font-bold text-[#2f8d72] transition hover:text-[#075f36]"
            >
              Ver catálogo completo <i class="pi pi-arrow-right" aria-hidden="true"></i>
            </a>
          </div>

          @if (featuredLoading()) {
            <div class="rounded-[2rem] border border-black/8 bg-white p-5 shadow-sm">
              <app-product-grid-skeleton [count]="6" />
            </div>
          } @else if (featuredProducts().length > 0) {
            <div
              class="home-marquee rounded-[2rem] border border-black/8 bg-white p-5 shadow-sm"
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
              class="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl lg:text-5xl"
            >
              La experiencia Lembas, pensada para vos
            </h2>
          </div>

          <div class="grid grid-cols-1 gap-8 sm:grid-cols-3">
            @for (benefit of benefits; track benefit.title) {
              <div
                class="group relative rounded-2xl border border-[rgba(7,95,54,0.08)] bg-white p-10 text-center shadow-[0_0_0.5px_0_rgba(0,0,0,0.14),0_2px_8px_0_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_0_0.5px_0_rgba(0,0,0,0.14),0_8px_24px_0_rgba(47,141,114,0.12)] hover:-translate-y-1"
              >
                <!-- Decorative accent line -->
                <div
                  class="absolute left-0 top-1/2 h-16 w-1 -translate-y-1/2 rounded-r-full bg-[#2f8d72] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  aria-hidden="true"
                ></div>
                
                <span
                  class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#d7eadf] to-[#e9f3ea] text-[#2f8d72] shadow-[0_4px_12px_rgba(47,141,114,0.15)]"
                >
                  <i [class]="benefit.icon + ' text-3xl'" aria-hidden="true"></i>
                </span>
                <h3 class="mt-6 text-xl font-bold tracking-[-0.01em] text-[rgba(0,0,0,0.87)]">{{ benefit.title }}</h3>
                <p class="mt-3 text-base leading-relaxed text-[rgba(0,0,0,0.58)]">
                  {{ benefit.description }}
                </p>
              </div>
            }
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
              class="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl lg:text-5xl"
            >
              Opiniones de la comunidad
            </h2>
            <!-- TODO: Replace mock reviews with real Google Maps / review platform data via API -->
            <div class="mt-6 flex items-center justify-center gap-3">
              <div class="flex gap-1">
                @for (star of [1, 2, 3, 4, 5]; track star) {
                  <i class="pi pi-star-fill text-[#f29d52] text-lg" aria-hidden="true"></i>
                }
              </div>
              <span class="text-base font-bold text-[rgba(0,0,0,0.87)]">4.8</span>
              <span class="text-sm text-[rgba(0,0,0,0.45)]">· 127 reseñas en Google</span>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            @for (review of reviews; track review.name) {
              <div
                class="group relative overflow-hidden rounded-2xl border border-[rgba(7,95,54,0.08)] bg-white p-7 shadow-[0_0_0.5px_0_rgba(0,0,0,0.14),0_2px_8px_0_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_0_0.5px_0_rgba(0,0,0,0.14),0_8px_24px_0_rgba(47,141,114,0.12)] hover:-translate-y-1"
              >
                <!-- Decorative quote mark -->
                <div
                  class="pointer-events-none absolute -right-4 -top-4 text-[8rem] font-serif leading-none text-[#d7eadf]/30"
                  aria-hidden="true"
                >
                  "
                </div>
                
                <div class="relative flex items-center gap-4">
                  <span
                    class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#075f36] to-[#2f8d72] text-base font-bold text-white shadow-[0_4px_12px_rgba(7,95,54,0.2)]"
                  >
                    {{ review.name.charAt(0) }}
                  </span>
                  <div>
                    <p class="text-base font-bold text-[rgba(0,0,0,0.87)]">{{ review.name }}</p>
                    <p class="text-xs text-[rgba(0,0,0,0.45)]">{{ review.date }}</p>
                  </div>
                </div>
                <div class="relative mt-4 flex gap-1">
                  @for (star of [1, 2, 3, 4, 5]; track star) {
                    <i
                      class="pi text-sm"
                      [class.pi-star-fill]="star <= review.rating"
                      [class.pi-star]="star > review.rating"
                      [class.text-[#f29d52]]="star <= review.rating"
                      [class.text-[rgba(0,0,0,0.15)]]="star > review.rating"
                      aria-hidden="true"
                    ></i>
                  }
                </div>
                <p class="relative mt-4 text-base leading-relaxed text-[rgba(0,0,0,0.7)]">
                  "{{ review.text }}"
                </p>
              </div>
            }
          </div>
        </section>
      </main>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .home-hero {
      background: #075f36;
    }

    .home-ticket {
      transform: rotate(1deg);
    }

    .home-marquee {
      overflow: hidden;
    }

    .home-marquee__track {
      display: flex;
      width: max-content;
      gap: 1.25rem;
      will-change: transform;
      animation: home-marquee-slide 80s linear infinite;
    }

    .home-marquee:hover .home-marquee__track {
      animation-play-state: paused;
    }

    @media (prefers-reduced-motion: reduce) {
      .home-marquee__track {
        animation: none;
      }
    }

    @keyframes home-marquee-slide {
      from {
        transform: translateX(0);
      }
      to {
        transform: translateX(-50%);
      }
    }
  `,
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
