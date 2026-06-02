import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppStoreFooter, StoreFooterLink } from './app-store-footer';

describe('AppStoreFooter', () => {
  let component: AppStoreFooter;
  let fixture: ComponentFixture<AppStoreFooter>;

  const links: StoreFooterLink[] = [
    { label: 'Catálogo', path: '/store/products' },
    { label: 'Como comprar', path: '/store' },
    { label: 'Instagram', path: 'https://www.instagram.com/dietetica.lembas', external: true },
    { label: 'Facebook', path: 'https://www.facebook.com/dietetica.lembas', external: true },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppStoreFooter],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AppStoreFooter);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('links', links);
    fixture.componentRef.setInput('copyright', '2026 Lembas');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the brand wordmark', () => {
    const wordmark = fixture.nativeElement.querySelector('.app-store-footer__wordmark');
    expect(wordmark).toBeTruthy();
    expect(wordmark.textContent.trim()).toBe('Lembas');
  });

  it('should render the Caveat tagline with the default copy', () => {
    const tagline = fixture.nativeElement.querySelector('.app-store-footer__tagline');
    expect(tagline).toBeTruthy();
    expect(tagline.textContent.trim()).toBe('Tu dietética de confianza');
  });

  it('should render the pickup label and city', () => {
    const meta = fixture.nativeElement.querySelector('.app-store-footer__meta');
    expect(meta).toBeTruthy();
    expect(meta.textContent).toContain('Retiro en sucursal');
    expect(meta.textContent).toContain('Córdoba, Argentina');
  });

  it('should split links into internal and external sets', () => {
    expect(component.internalLinks().length).toBe(2);
    expect(component.externalLinks().length).toBe(2);
  });

  it('should render internal links as router anchors in the Tienda column', () => {
    const col = fixture.nativeElement.querySelector('nav[aria-label="Tienda"]');
    expect(col).toBeTruthy();
    const items = col.querySelectorAll('a');
    expect(items.length).toBe(2);
  });

  it('should render external links as social icon buttons with proper icon mapping', () => {
    const buttons = fixture.nativeElement.querySelectorAll('.app-store-footer__social-btn');
    expect(buttons.length).toBe(2);
    const igIcon = buttons[0].querySelector('i');
    const fbIcon = buttons[1].querySelector('i');
    expect(igIcon.classList.contains('pi-instagram')).toBe(true);
    expect(fbIcon.classList.contains('pi-facebook')).toBe(true);
  });

  it('should open external links in a new tab with rel noopener', () => {
    const buttons = fixture.nativeElement.querySelectorAll('.app-store-footer__social-btn');
    for (const btn of buttons) {
      expect(btn.getAttribute('target')).toBe('_blank');
      expect(btn.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('should render the copyright text', () => {
    const copy = fixture.nativeElement.querySelector('.app-store-footer__copy');
    expect(copy).toBeTruthy();
    expect(copy.textContent.trim()).toBe('2026 Lembas');
  });

  it('should map unknown URLs to a generic external link icon', () => {
    expect(component.iconForPath('https://example.com/page')).toBe('pi-link');
    expect(component.iconForPath('https://www.tiktok.com/@lembas')).toBe('pi-tiktok');
    expect(component.iconForPath('https://wa.me/5493510000000')).toBe('pi-whatsapp');
  });
});
