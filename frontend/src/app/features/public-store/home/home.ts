import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonDirective } from 'primeng/button';
import { Ripple } from 'primeng/ripple';

import { CatalogService } from '../../../core/services/catalog';
import { CardBanner } from '../../../shared/components/app-card-banner/app-card-banner';
import { StoreProductCard } from '../../../shared/components/store-product-card/store-product-card';
import { HeroFlowers } from '../../../shared/components/hero-flowers/hero-flowers';
import { ProductSummary } from '../../../shared/models/product';

@Component({
  selector: 'app-home',
  imports: [CardBanner, RouterLink, ButtonDirective, Ripple, StoreProductCard, HeroFlowers],
  template: `
    <div class="home-page min-h-screen overflow-hidden bg-[#f5ead8] text-stone-950">
      <!-- Editorial hero with organic depth -->
      <header
        class="home-hero relative isolate overflow-hidden px-4 py-16 sm:px-6 md:py-24 lg:px-8"
      >
        <!-- Decorative organic shapes -->
        <div class="pointer-events-none absolute -right-20 -top-20 h-[500px] w-[500px] rounded-full bg-[#f29d52]/10 blur-3xl" aria-hidden="true"></div>
        <div class="pointer-events-none absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-[#2f8d72]/10 blur-3xl" aria-hidden="true"></div>

        <!-- Decorative Lembas flowers -->
        <app-hero-flowers />

        <div class="relative mx-auto grid w-full max-w-[1600px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_0.85fr] lg:px-10">
          <section class="w-full max-w-3xl min-w-0">
            <span
              class="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/90"
            >
              <i class="pi pi-leaf text-[0.7rem]" aria-hidden="true"></i>
              Dietética Lembas
            </span>

            <h1
              class="mt-8 max-w-[760px] text-5xl font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-6xl lg:text-[5rem]"
            >
              Tu despensa natural, lista para retirar
            </h1>

            <p class="mt-6 w-full max-w-[660px] text-base font-medium leading-7 text-white/80 sm:text-lg">
              Productos saludables para comprar online y retirar en sucursal.
            </p>

            <div class="mt-10 flex flex-col gap-3 sm:flex-row">
              <a
                pButton
                pRipple
                routerLink="/store/catalog"
                class="!rounded-full !border-0 !bg-white !px-8 !py-4 !font-bold !text-[#075f36] shadow-xl shadow-black/20 transition-all hover:-translate-y-0.5 hover:shadow-2xl"
              >
                Explorar catálogo
                <i class="pi pi-arrow-right ml-2" aria-hidden="true"></i>
              </a>
            </div>
          </section>

          <aside class="hidden lg:block" aria-label="Resumen de compra">
            <div
              class="home-ticket relative ml-auto max-w-sm rounded-[2rem] border border-white/10 bg-[#fffaf0]/95 p-7 shadow-2xl shadow-black/30 backdrop-blur-sm"
            >
              <div class="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#064e3b]" aria-hidden="true"></div>
              <div class="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#064e3b]" aria-hidden="true"></div>

              <div
                class="flex items-center justify-between border-b-2 border-dashed border-stone-300 pb-5"
              >
                <span class="text-[11px] font-bold uppercase tracking-[0.2em] text-black/58">
                  Pedido simple
                </span>
                <span class="rounded-full bg-[#075f36] px-3 py-1 text-[11px] font-bold text-white tracking-wide">
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
              <p class="text-[11px] font-bold uppercase tracking-[0.2em] text-[#2f8d72]">
                Selección curada
              </p>
              <h2
                id="home-products-title"
                class="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl"
              >
                Recomendados de la semana
              </h2>
            </div>
            <a
              routerLink="/store/catalog"
              class="inline-flex items-center gap-2 text-sm font-bold text-[#2f8d72] transition hover:text-[#075f36]"
            >
              Ver catálogo completo <i class="pi pi-arrow-right" aria-hidden="true"></i>
            </a>
          </div>

          @if (featuredProducts().length > 0) {
            <div
              class="home-marquee rounded-[2rem] border border-black/8 bg-[#fffaf0] p-5 shadow-sm"
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

        <!-- Catalog access block -->
        <section
          class="mx-auto mt-20 w-full max-w-[1600px] px-4 sm:px-6 lg:px-10"
          aria-label="Acceso al catálogo"
        >
          <app-card-banner
            blobColor="#2f8d72"
            [blobOpacity]="5"
            blobPosition="top-right"
            blobSize="md"
            padding="2rem"
          >
            <div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between lg:flex">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-[0.2em] text-[#2f8d72]">
                  Catálogo completo
                </p>
                <h2 class="mt-3 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                  Todas las categorías en la góndola
                </h2>
                <p class="mt-3 w-full max-w-[620px] text-sm font-medium leading-6 text-stone-600 sm:text-base">
                  Buscá por categoría, marca o nombre del producto.
                </p>
              </div>
              <div class="flex shrink-0 lg:ml-8">
                <a
                  pButton
                  pRipple
                  routerLink="/store/catalog"
                  class="!rounded-full !border-0 !bg-[#075f36] !px-8 !py-4 !font-bold !text-white transition-all hover:!bg-[#06402a] hover:-translate-y-0.5"
                >
                  Abrir catálogo
                  <i class="pi pi-arrow-right ml-2" aria-hidden="true"></i>
                </a>
              </div>
            </div>
          </app-card-banner>
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
      transform: rotate(1deg);
    }

    .home-marquee {
      overflow: hidden;
    }

    .home-marquee__track {
      display: flex;
      width: max-content;
      gap: 1.25rem;
      animation: home-marquee-slide 38s linear infinite;
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
    this.catalogService.getProducts(undefined, undefined, undefined, 0, 8).subscribe((res) => {
      this.featuredProducts.set(res.content);
    });
  }
}
