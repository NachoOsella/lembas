import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { AppReportSectionHead } from './app-report-section-head';

describe('AppReportSectionHead', () => {
  let component: AppReportSectionHead;
  let fixture: ComponentFixture<AppReportSectionHead>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppReportSectionHead],
    }).compileComponents();

    fixture = TestBed.createComponent(AppReportSectionHead);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Top productos del mes');
    fixture.detectChanges();
  });

  it('creates the section head', () => {
    expect(component).toBeTruthy();
  });

  it('renders the title without an icon when none is provided', () => {
    const text: string = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Top productos del mes');
    const icon = fixture.nativeElement.querySelector('i');
    expect(icon).toBeFalsy();
  });

  it('renders the eyebrow and description when provided', () => {
    fixture.componentRef.setInput('eyebrow', 'Mes actual');
    fixture.componentRef.setInput('description', 'Productos ordenados por facturacion.');
    fixture.detectChanges();
    const text: string = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Mes actual');
    expect(text).toContain('Productos ordenados por facturacion.');
  });

  it('renders the leading icon when explicitly provided', () => {
    fixture.componentRef.setInput('icon', 'pi pi-chart-line');
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('i');
    expect(icon).toBeTruthy();
    expect(icon?.className).toContain('pi-chart-line');
  });
});
