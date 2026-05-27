import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonDirective } from 'primeng/button';
import { Ripple } from 'primeng/ripple';

import { CatalogService } from '../../../core/services/catalog';
import { StoreProductCard } from '../../../shared/components/store-product-card/store-product-card';
import { ProductSummary } from '../../../shared/models/product';

@Component({
  selector: 'app-home',
  imports: [RouterLink, ButtonDirective, Ripple, StoreProductCard],
  template: `
    <div class="home-page min-h-screen overflow-hidden bg-[#f5ead8] text-stone-950">
      <!-- Solid editorial hero: no gradients, only flat color and layered cards. -->
      <header
        class="home-hero relative isolate border-b border-emerald-950/15 px-4 py-14 sm:px-6 md:py-20 lg:px-8"
      >
        <div class="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_0.82fr]">
          <section class="max-w-3xl">
            <span
              class="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-50"
            >
              <i class="pi pi-leaf text-[0.75rem]" aria-hidden="true"></i>
              Dietética Lembas
            </span>

            <h1
              class="mt-7 max-w-4xl text-5xl font-black leading-[0.94] tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl"
            >
              Tu despensa natural, lista para retirar
            </h1>

            <p class="mt-7 max-w-2xl text-lg font-medium leading-8 text-emerald-50/90 sm:text-xl">
              Catálogo saludable con productos de dietética, orgánicos e integrales. Elegí online y
              pasá por la sucursal sin vueltas.
            </p>

            <div class="mt-10 flex flex-col gap-3 sm:flex-row">
              <a
                pButton
                pRipple
                routerLink="/store/catalog"
                class="!rounded-full !border-0 !bg-white !px-7 !py-4 !font-black !text-emerald-950 shadow-xl shadow-emerald-950/20 transition-transform hover:-translate-y-0.5"
              >
                Ver catálogo
                <i class="pi pi-arrow-right ml-2" aria-hidden="true"></i>
              </a>
              <a
                routerLink="/store/catalog"
                class="inline-flex items-center justify-center rounded-full border border-white/25 px-7 py-4 font-black text-white transition hover:bg-white/10"
              >
                Cómo comprar
              </a>
            </div>
          </section>

          <aside class="hidden lg:block" aria-label="Resumen de compra">
            <div
              class="home-ticket ml-auto max-w-md rounded-[2.25rem] border border-emerald-950/15 bg-[#fffaf0] p-6 shadow-2xl shadow-emerald-950/25"
            >
              <div
                class="flex items-center justify-between border-b border-dashed border-stone-300 pb-4"
              >
                <span class="text-xs font-black uppercase tracking-[0.2em] text-emerald-900/70">
                  Pedido simple
                </span>
                <span class="rounded-full bg-emerald-800 px-3 py-1 text-xs font-black text-white">
                  Pickup
                </span>
              </div>
              <ul class="mt-5 space-y-4 text-sm font-bold text-stone-700">
                <li class="flex items-center gap-3">
                  <span
                    class="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-800"
                    >1</span
                  >
                  Mirá recomendados o entrá al catálogo
                </li>
                <li class="flex items-center gap-3">
                  <span
                    class="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-800"
                    >2</span
                  >
                  Filtrá por categoría desde la góndola
                </li>
                <li class="flex items-center gap-3">
                  <span
                    class="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-800"
                    >3</span
                  >
                  Retirá tu compra en sucursal
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </header>

      <main class="relative py-14 lg:py-20">
        <!-- Recommendations use a reusable product card and move continuously from right to left. -->
        <section
          class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
          aria-labelledby="home-products-title"
        >
          <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p class="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
                Selección curada
              </p>
              <h2
                id="home-products-title"
                class="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl"
              >
                Recomendados de la semana
              </h2>
            </div>
            <a
              routerLink="/store/catalog"
              class="inline-flex items-center gap-2 font-black text-emerald-800 transition hover:text-emerald-950"
            >
              Ver catálogo completo <i class="pi pi-arrow-right" aria-hidden="true"></i>
            </a>
          </div>

          @if (featuredProducts().length > 0) {
            <div
              class="home-marquee rounded-[2rem] border border-emerald-950/10 bg-[#fffaf0] p-4 shadow-sm shadow-stone-900/5"
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

        <section
          class="mx-auto mt-14 max-w-7xl px-4 sm:px-6 lg:px-8"
          aria-label="Acceso al catálogo"
        >
          <div
            class="flex flex-col gap-5 rounded-[2rem] border border-emerald-950/10 bg-white p-6 shadow-sm shadow-stone-900/5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p class="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
                Catálogo completo
              </p>
              <h2 class="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                Todas las categorías viven en la góndola
              </h2>
              <p class="mt-3 max-w-2xl font-medium leading-7 text-stone-600">
                Para evitar una home interminable, el filtrado por categorías queda concentrado en
                el catálogo.
              </p>
            </div>
            <a
              pButton
              pRipple
              routerLink="/store/catalog"
              class="!rounded-full !border-0 !bg-emerald-800 !px-7 !py-4 !font-black !text-white hover:!bg-emerald-950"
            >
              Abrir catálogo
              <i class="pi pi-arrow-right ml-2" aria-hidden="true"></i>
            </a>
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
      background: #064e3b;
    }

    .home-ticket {
      transform: rotate(1.5deg);
    }

    .home-marquee {
      overflow: hidden;
    }

    .home-marquee__track {
      display: flex;
      width: max-content;
      gap: 1rem;
      animation: home-marquee-slide 34s linear infinite;
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

  ngOnInit(): void {
    // Load a compact product selection for the home recommendations marquee.
    this.catalogService.getProducts(undefined, undefined, undefined, 0, 8).subscribe((res) => {
      this.featuredProducts.set(res.content);
    });
  }
}
