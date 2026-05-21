import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface FooterLink {
  readonly label: string;
  readonly path: string;
  readonly external?: boolean;
}

interface FooterGroup {
  readonly label: string;
  readonly links: readonly FooterLink[];
}

interface StoreNavItem {
  readonly label: string;
  readonly path: string;
}

@Component({
  selector: 'app-store-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './store-layout.html',
  styleUrl: './store-layout.css',
})
/** Provides the public store shell with branded navigation, cart access, and footer. */
export class StoreLayout {
  protected readonly cartItemsCount = signal(0);

  protected readonly navItems: readonly StoreNavItem[] = [
    { label: 'Tienda', path: '/store' },
    { label: 'Productos', path: '/store' },
    { label: 'Como comprar', path: '/store#como-comprar' },
  ];

  protected readonly footerGroups: readonly FooterGroup[] = [
    {
      label: 'Ayuda',
      links: [
        { label: 'Como comprar', path: '/store' },
        { label: 'Retiro en sucursal', path: '/store' },
        { label: 'Preguntas frecuentes', path: '/store' },
      ],
    },
    {
      label: 'Legales',
      links: [
        { label: 'Terminos y condiciones', path: '/store' },
        { label: 'Privacidad', path: '/store' },
      ],
    },
    {
      label: 'Redes',
      links: [
        { label: 'Instagram', path: 'https://www.instagram.com/', external: true },
        { label: 'Facebook', path: 'https://www.facebook.com/', external: true },
      ],
    },
  ];
}
