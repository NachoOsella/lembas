import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppBreadcrumb } from './app-breadcrumb';

describe('AppBreadcrumb', () => {
  let component: AppBreadcrumb;
  let fixture: ComponentFixture<AppBreadcrumb>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppBreadcrumb],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AppBreadcrumb);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('items', [
      { label: 'Tienda', routerLink: '/store' },
      { label: 'Productos', routerLink: '/store' },
      { label: 'Granola artesanal' },
    ]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
