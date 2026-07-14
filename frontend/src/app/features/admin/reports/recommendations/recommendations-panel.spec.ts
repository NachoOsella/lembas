import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';

import { RecommendationsPanelComponent } from './recommendations-panel';

describe('RecommendationsPanelComponent', () => {
  let component: RecommendationsPanelComponent;
  let fixture: ComponentFixture<RecommendationsPanelComponent>;
  let c: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecommendationsPanelComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), MessageService],
    }).compileComponents();

    fixture = TestBed.createComponent(RecommendationsPanelComponent);
    component = fixture.componentInstance;
    c = component;
  });

  it('creates the recommendations panel', () => {
    expect(component).toBeTruthy();
  });

  it('exposes the type filter options', () => {
    expect(c.typeOptions.length).toBe(5);
    expect(c.typeOptions[0].value).toBeNull();
  });

  it('exposes the urgency filter options', () => {
    expect(c.urgencyOptions.length).toBe(4);
    expect(c.urgencyOptions[0].value).toBeNull();
  });

  it('paginates recommendations and resets first on filter change', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({
      id: 'LOW_STOCK-' + i,
      type: 'LOW_STOCK' as const,
      title: 'Stock bajo: ' + i,
      description: '...',
      urgency: 'LOW' as const,
      iconName: 'pi pi-exclamation-triangle',
      link: '/admin/inventory/product/' + i + '/lots',
      actionLabel: 'Reponer',
      productId: i,
      productName: 'Producto ' + i,
      categoryId: 1,
      categoryName: 'Cat',
      barcode: null,
      generatedAt: '2026-07-13T10:00:00Z',
    }));
    component.recommendations.set(items);
    expect(c.totalPages()).toBe(3);

    // First page has 10 items.
    let groups = c.pagedGroups();
    expect(groups.length).toBe(1);
    expect(groups[0].items.length).toBe(10);

    // Second page.
    c.first.set(10);
    groups = c.pagedGroups();
    expect(groups[0].items.length).toBe(10);

    // Third page has the remaining 5.
    c.first.set(20);
    groups = c.pagedGroups();
    expect(groups[0].items.length).toBe(5);

    // Filter change resets to first page.
    c.onUrgencyChange('HIGH');
    expect(c.first()).toBe(0);
  });

  it('groups recommendations by type on current page and skips empty sections', () => {
    component.recommendations.set([
      {
        id: 'LOW_STOCK-1',
        type: 'LOW_STOCK',
        title: 'Stock bajo: A',
        description: '...',
        urgency: 'HIGH',
        iconName: 'pi pi-exclamation-triangle',
        link: '/admin/inventory/product/1/lots',
        actionLabel: 'Reponer',
        productId: 1,
        productName: 'A',
        categoryId: 1,
        categoryName: 'Cat',
        barcode: null,
        generatedAt: '2026-07-13T10:00:00Z',
      },
    ]);
    const groups = c.pagedGroups();
    expect(groups.length).toBe(1);
    expect(groups[0].type).toBe('LOW_STOCK');
  });

  it('exposes paginator via template', () => {
    // The template conditionally renders app-pagination when totalPages > 1.
    const items = Array.from({ length: 15 }, (_, i) => ({
      id: 'LOW_STOCK-' + i,
      type: 'LOW_STOCK' as const,
      title: 'Stock bajo: ' + i,
      description: '...',
      urgency: 'LOW' as const,
      iconName: 'pi pi-exclamation-triangle',
      link: '/admin/inventory/product/' + i + '/lots',
      actionLabel: 'Reponer',
      productId: i,
      productName: 'Producto ' + i,
      categoryId: 1,
      categoryName: 'Cat',
      barcode: null,
      generatedAt: '2026-07-13T10:00:00Z',
    }));
    component.recommendations.set(items);
    expect(c.totalPages()).toBe(2);
    expect(c.flatItems().length).toBe(15);
    fixture.detectChanges();
    // The paginator component should be rendered.
    const paginator = fixture.nativeElement.querySelector('.app-pagination');
    expect(paginator).toBeTruthy();
  });
});
