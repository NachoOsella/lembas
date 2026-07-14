import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { MessageService } from 'primeng/api';

import { CashSessionDetailReportPageComponent } from './cash-session-detail';

describe('CashSessionDetailReportPageComponent', () => {
  let component: CashSessionDetailReportPageComponent;
  let fixture: ComponentFixture<CashSessionDetailReportPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CashSessionDetailReportPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ sessionId: '7' }) },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CashSessionDetailReportPageComponent);
    component = fixture.componentInstance;
  });

  it('creates the page', () => {
    expect(component).toBeTruthy();
  });

  it('exposes the method label translator', () => {
    expect(component['methodLabel']('CASH')).toBe('Efectivo');
    expect(component['methodLabel']('CHECKOUT_PRO')).toBe('Mercado Pago');
  });

  it('exposes the status label translator', () => {
    expect(component.statusLabel('OPEN')).toBe('Sesion abierta');
    expect(component.statusLabel('CLOSED')).toBe('Sesion cerrada');
  });

  it('returns an empty export payload when no data is loaded', () => {
    const payload = component.exportData();
    expect(payload.filename).toBe('reporte_cierre_caja');
    expect(payload.rows).toEqual([]);
  });
});
