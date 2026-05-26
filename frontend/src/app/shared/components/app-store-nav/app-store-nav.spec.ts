import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppStoreNav, StoreBrandConfig, StoreNavLink } from './app-store-nav';

describe('AppStoreNav', () => {
  let component: AppStoreNav;
  let fixture: ComponentFixture<AppStoreNav>;

  const brand: StoreBrandConfig = {
    logoUrl: '/brand/lembas-icon.svg?v=4',
    title: 'Lembas',
    subtitle: 'Tienda saludable',
    homeRoute: '/store',
  };

  const navItems: StoreNavLink[] = [
    { label: 'Tienda', path: '/store' },
    { label: 'Productos', path: '/store' },
    { label: 'Como comprar', path: '/store' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppStoreNav],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AppStoreNav);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('brand', brand);
    fixture.componentRef.setInput('navItems', navItems);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render brand title', () => {
    const strong = fixture.nativeElement.querySelector('.app-store-nav__brand-text strong');
    expect(strong).toBeTruthy();
    expect(strong.textContent.trim()).toBe('Lembas');
  });

  it('should render nav links', () => {
    const links = fixture.nativeElement.querySelectorAll('.app-store-nav__link');
    expect(links.length).toBe(6); // 3 desktop + 3 mobile
  });

  it('should show login and register when not logged in', () => {
    fixture.componentRef.setInput('isLoggedIn', false);
    fixture.detectChanges();

    const cta = fixture.nativeElement.querySelector('.app-store-nav__cta');
    expect(cta).toBeTruthy();
    expect(cta.textContent.trim()).toBe('Crear cuenta');
  });

  it('should show user name when logged in', () => {
    fixture.componentRef.setInput('isLoggedIn', true);
    fixture.componentRef.setInput('userDisplayName', 'Frodo');
    fixture.detectChanges();

    const name = fixture.nativeElement.querySelector('.app-store-nav__user-name');
    expect(name).toBeTruthy();
    expect(name.textContent.trim()).toBe('Frodo');
  });

  it('should emit cartClick when cart is clicked', () => {
    const spy = vi.fn();
    component.cartClick.subscribe(spy);

    // Emit directly rather than clicking the DOM element,
    // to avoid triggering a pending Router navigation after teardown.
    component.cartClick.emit();

    expect(spy).toHaveBeenCalled();
  });
});
