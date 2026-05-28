import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppStatCard } from './app-stat-card';

describe('AppStatCard', () => {
  let fixture: ComponentFixture<AppStatCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AppStatCard] }).compileComponents();
    fixture = TestBed.createComponent(AppStatCard);
    fixture.componentRef.setInput('metrics', [
      { label: 'Total', value: 4, detail: 'usuarios', icon: 'pi pi-users', tone: 'forest' },
    ]);
    fixture.detectChanges();
  });

  it('should render metric values', () => {
    expect(fixture.nativeElement.textContent).toContain('Total');
    expect(fixture.nativeElement.textContent).toContain('4');
  });

  it('should render trend-up icon', () => {
    fixture.componentRef.setInput('metrics', [
      { label: 'Ventas', value: '+12%', trend: 'up' },
    ]);
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('.metric-strip__trend-icon');
    expect(icon).toBeTruthy();
    expect(icon.classList).toContain('pi-arrow-up');
  });

  it('should render trend-down icon', () => {
    fixture.componentRef.setInput('metrics', [
      { label: 'Perdidas', value: '-5%', trend: 'down' },
    ]);
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('.metric-strip__trend-icon');
    expect(icon).toBeTruthy();
    expect(icon.classList).toContain('pi-arrow-down');
  });

  it('should not render trend icon for neutral trend', () => {
    fixture.componentRef.setInput('metrics', [
      { label: 'Total', value: '42', trend: 'neutral' },
    ]);
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('.metric-strip__trend-icon');
    expect(icon).toBeFalsy();
  });

  it('should not render trend icon when trend is absent', () => {
    fixture.componentRef.setInput('metrics', [
      { label: 'Total', value: '42' },
    ]);
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('.metric-strip__trend-icon');
    expect(icon).toBeFalsy();
  });

  it('should apply trend-up CSS class to the article', () => {
    fixture.componentRef.setInput('metrics', [
      { label: 'Ventas', value: '+12%', trend: 'up' },
    ]);
    fixture.detectChanges();
    const article = fixture.nativeElement.querySelector('.metric-strip__item');
    expect(article.classList).toContain('metric-strip__item--trend-up');
  });

  it('should apply trend-down CSS class to the article', () => {
    fixture.componentRef.setInput('metrics', [
      { label: 'Perdidas', value: '-5%', trend: 'down' },
    ]);
    fixture.detectChanges();
    const article = fixture.nativeElement.querySelector('.metric-strip__item');
    expect(article.classList).toContain('metric-strip__item--trend-down');
  });

  it('should apply trend-neutral CSS class to the article', () => {
    fixture.componentRef.setInput('metrics', [
      { label: 'Total', value: '42', trend: 'neutral' },
    ]);
    fixture.detectChanges();
    const article = fixture.nativeElement.querySelector('.metric-strip__item');
    expect(article.classList).toContain('metric-strip__item--trend-neutral');
  });

  it('should render multiple metrics', () => {
    fixture.componentRef.setInput('metrics', [
      { label: 'A', value: 1, trend: 'up' },
      { label: 'B', value: 2, trend: 'down' },
      { label: 'C', value: 3, trend: 'neutral' },
    ]);
    fixture.detectChanges();
    const articles = fixture.nativeElement.querySelectorAll('.metric-strip__item');
    expect(articles.length).toBe(3);
    expect(articles[0].classList).toContain('metric-strip__item--trend-up');
    expect(articles[1].classList).toContain('metric-strip__item--trend-down');
    expect(articles[2].classList).toContain('metric-strip__item--trend-neutral');
  });
});
