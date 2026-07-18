import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { StoreFooterLink } from './app-store-footer';
import { AppStoreFooter } from './app-store-footer';

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

  it('should render the brand name', () => {
    expect(fixture.nativeElement.textContent).toContain('Dietética Lembas');
  });

  it('should render the copyright text', () => {
    const copy = fixture.nativeElement.querySelector('.app-store-footer__copy');
    expect(copy).toBeTruthy();
    expect(copy.textContent.trim()).toBe('2026 Lembas');
  });

  it('should render all configured links', () => {
    const renderedLinks = fixture.nativeElement.querySelectorAll('.app-store-footer__link');

    expect(renderedLinks.length).toBe(4);
    expect(fixture.nativeElement.textContent).toContain('Catálogo');
    expect(fixture.nativeElement.textContent).toContain('Instagram');
  });

  it('should open external links in a new tab with rel noopener', () => {
    const externalLinks = Array.from<HTMLAnchorElement>(
      fixture.nativeElement.querySelectorAll('a[target="_blank"]'),
    );

    expect(externalLinks.length).toBe(2);
    for (const link of externalLinks) {
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });
});
