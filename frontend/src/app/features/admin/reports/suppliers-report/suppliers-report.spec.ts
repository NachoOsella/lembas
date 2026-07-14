import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { SuppliersReportPageComponent } from './suppliers-report';

interface TestableSuppliers {
  fromDate: () => Date | null;
  toDate: () => Date | null;
}

describe('SuppliersReportPageComponent', () => {
  let component: SuppliersReportPageComponent;
  let fixture: ComponentFixture<SuppliersReportPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuppliersReportPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SuppliersReportPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the suppliers report page', () => {
    expect(component).toBeTruthy();
  });

  it('initialises the from-date to 89 days before today', () => {
    const testable = component as unknown as TestableSuppliers;
    const from = testable.fromDate();
    const today = new Date();
    expect(from).toBeTruthy();
    if (from) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - 89);
      expect(from.getFullYear()).toBe(expected.getFullYear());
    }
  });
});
