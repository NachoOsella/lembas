import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { ReportsService } from '../../../../core/services/reports';
import { UserService } from '../../../../core/services/user';
import { EmployeeReportDto } from '../../../../shared/models/reports';
import { EmployeesReportPageComponent } from './employees-report';

const report: EmployeeReportDto = {
  from: '2026-07-01',
  to: '2026-07-31',
  branchId: null,
  branchName: null,
  generatedAt: '2026-07-31T12:00:00Z',
  kpis: [
    {
      label: 'Operadores con actividad',
      value: '1',
      subtitle: 'Ventas POS o actividad de caja',
      iconName: 'pi pi-users',
      colorStyle: 'INFO',
    },
  ],
  employees: [
    {
      employeeId: 7,
      employeeName: 'Carla Cajero',
      role: 'EMPLOYEE',
      posSalesCount: 5,
      posRevenue: 12500,
      averageTicket: 2500,
      cashSessionsOpened: 2,
      cashSessionsClosed: 2,
      cashDifferenceAbsolute: 0,
    },
  ],
};

describe('EmployeesReportPageComponent', () => {
  let fixture: ComponentFixture<EmployeesReportPageComponent>;
  let reportsService: { getEmployeeReport: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    reportsService = { getEmployeeReport: vi.fn().mockReturnValue(of(report)) };

    await TestBed.configureTestingModule({
      imports: [EmployeesReportPageComponent],
      providers: [
        MessageService,
        { provide: ReportsService, useValue: reportsService },
        { provide: UserService, useValue: { listBranches: () => of([]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeesReportPageComponent);
    fixture.detectChanges();
  });

  it('loads the employee report for the current month', () => {
    expect(reportsService.getEmployeeReport).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('Carla Cajero');
    expect(fixture.nativeElement.textContent).toContain('Ventas POS');
  });

  it('renders the employee POS and cash metrics', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('5');
    expect(text).toContain('2');
    expect(text).toContain('Empleado');
  });
});
