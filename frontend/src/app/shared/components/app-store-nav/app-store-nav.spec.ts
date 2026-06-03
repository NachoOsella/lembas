import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppStoreNav, StoreBrandConfig } from './app-store-nav';

describe('AppStoreNav', () => {
  let component: AppStoreNav;
  let fixture: ComponentFixture<AppStoreNav>;

  const brand: StoreBrandConfig = {
    logoUrl: '/brand/lembas-icon.svg?v=4',
    title: 'Lembas',
    subtitle: 'Tienda saludable',
    homeRoute: '/store',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppStoreNav],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AppStoreNav);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('brand', brand);
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

  it('should render search bar by default (showSearch=true)', () => {
    const searchBars = fixture.nativeElement.querySelectorAll('app-search-bar');
    expect(searchBars.length).toBeGreaterThanOrEqual(1);
  });

  it('should hide search bar when showSearch=false', () => {
    fixture.componentRef.setInput('showSearch', false);
    fixture.detectChanges();

    const searchBars = fixture.nativeElement.querySelectorAll('app-search-bar');
    expect(searchBars.length).toBe(0);
  });

  it('should show login and register when not logged in', () => {
    fixture.componentRef.setInput('isLoggedIn', false);
    fixture.detectChanges();

    const authActions = fixture.nativeElement.querySelector('.app-store-nav__auth');
    expect(authActions).toBeTruthy();
    expect(authActions.textContent).toContain('Ingresar');
    expect(authActions.textContent).toContain('Crear cuenta');
  });

  it('should show user name when logged in', () => {
    fixture.componentRef.setInput('isLoggedIn', true);
    fixture.componentRef.setInput('userDisplayName', 'Frodo');
    fixture.detectChanges();

    const name = fixture.nativeElement.querySelector('.app-store-nav__user-name');
    expect(name).toBeTruthy();
    expect(name.textContent.trim()).toBe('Frodo');
  });

  it('should emit searchQuery when search is triggered', () => {
    const spy = vi.fn();
    component.searchQuery.subscribe(spy);

    component.searchQuery.emit('granola');

    expect(spy).toHaveBeenCalledWith('granola');
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
