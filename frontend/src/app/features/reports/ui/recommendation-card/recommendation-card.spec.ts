import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { RecommendationCard } from './recommendation-card';
import type { RecommendationDto } from '@features/reports/domain/recommendation';

const SAMPLE: RecommendationDto = {
  id: 'LOW_STOCK-1',
  type: 'LOW_STOCK',
  title: 'Stock bajo: Granola',
  description: 'Stock actual: 2, minimo: 10.',
  urgency: 'HIGH',
  iconName: 'pi pi-exclamation-triangle',
  link: '/admin/inventory/product/1/lots',
  actionLabel: 'Reponer stock',
  productId: 1,
  productName: 'Granola',
  categoryId: 1,
  categoryName: 'Cereales',
  barcode: '12345',
  currentStock: 2,
  minimumStock: 10,
  generatedAt: '2026-07-13T10:00:00Z',
};

describe('RecommendationCard', () => {
  let component: RecommendationCard;
  let fixture: ComponentFixture<RecommendationCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecommendationCard],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(RecommendationCard);
    component = fixture.componentInstance;
  });

  it('maps the urgency to a badge tone', () => {
    fixture.componentRef.setInput('recommendation', SAMPLE);
    expect(component.tone()).toBe('danger');
  });

  it('renders the recommendation title and description', () => {
    fixture.componentRef.setInput('recommendation', SAMPLE);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Stock bajo: Granola');
    expect(text).toContain('Stock actual: 2, minimo: 10.');
  });

  it('falls back to a loading skeleton while loading', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.componentRef.setInput('recommendation', SAMPLE);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.rec-card--loading')).toBeTruthy();
  });
});
