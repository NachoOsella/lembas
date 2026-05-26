import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppStoreFooter, StoreFooterLink } from './app-store-footer';

describe('AppStoreFooter', () => {
  let component: AppStoreFooter;
  let fixture: ComponentFixture<AppStoreFooter>;

  const links: StoreFooterLink[] = [
    { label: 'Como comprar', path: '/store' },
    { label: 'Terminos', path: '/store' },
    { label: 'Instagram', path: 'https://instagram.com/', external: true },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppStoreFooter],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AppStoreFooter);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('links', links);
    fixture.componentRef.setInput('copyright', '2025 Lembas');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render copyright text', () => {
    const copy = fixture.nativeElement.querySelector('.app-store-footer__copy');
    expect(copy).toBeTruthy();
    expect(copy.textContent.trim()).toBe('2025 Lembas');
  });

  it('should render all footer links', () => {
    const elems = fixture.nativeElement.querySelectorAll('.app-store-footer__link');
    expect(elems.length).toBe(3);
  });
});
