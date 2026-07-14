import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppReportFilterBar } from './app-report-filter-bar';

describe('AppReportFilterBar', () => {
  let component: AppReportFilterBar;
  let fixture: ComponentFixture<AppReportFilterBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppReportFilterBar],
    }).compileComponents();

    fixture = TestBed.createComponent(AppReportFilterBar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the filter bar', () => {
    expect(component).toBeTruthy();
  });

  it('shows the default "Filtros" kicker when no caption is provided', () => {
    const text: string = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Filtros');
  });

  it('shows a custom kicker when caption is provided', () => {
    fixture.componentRef.setInput('caption', 'Resumen');
    fixture.detectChanges();
    const text: string = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Resumen');
  });

  it('hides the secondary line when no description is provided', () => {
    const text: string = fixture.nativeElement.textContent ?? '';
    expect(text).not.toContain('Refina los datos');
  });
});
