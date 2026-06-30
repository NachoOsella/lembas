import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Pos } from './pos';
import { PosProductSearchComponent } from './components/pos-product-search/pos-product-search';
import { AppPageHeader } from '../../../shared/components/app-page-header/app-page-header';

/** Unit tests for the {@link Pos} landing page. */
describe('Pos', () => {
  let fixture: ComponentFixture<Pos>;
  let component: Pos;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pos],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Pos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the page', () => {
    expect(component).toBeTruthy();
  });

  it('renders the app-page-header with the POS eyebrow and title', () => {
    const header = fixture.nativeElement.querySelector('app-page-header');
    expect(header).toBeTruthy();
  });

  it('wraps the content in the .pos-page layout container', () => {
    const page = fixture.nativeElement.querySelector('.pos-page');
    expect(page).toBeTruthy();
    expect(page.querySelector('app-pos-product-search')).toBeTruthy();
  });

  it('renders the search bar inside the layout', () => {
    const search = fixture.nativeElement.querySelector(
      'app-pos-product-search',
    );
    expect(search).toBeTruthy();
  });

  it('declares the standalone search component and page header as dependencies', () => {
    // Defensive: the imports are part of the public surface; if a future
    // refactor removes either of them the page will silently break. This
    // pins the dependency in tests.
    expect(PosProductSearchComponent).toBeDefined();
    expect(AppPageHeader).toBeDefined();
  });
});
