import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { InventoryReportPageComponent } from './inventory-report';

interface TestableInventory {
  /** Branches signal exposed for testing. */
  branches: { set: (val: unknown[]) => void; (): unknown[] };
  /** Branch options computed signal. */
  branchOptions: () => ReadonlyArray<{ label: string; value: number | null }>;
  /** Column definition used to paginate long low-stock results. */
  lowStockColumns: ReadonlyArray<{ field: string; header: string }>;
}

describe('InventoryReportPageComponent', () => {
  let component: InventoryReportPageComponent;
  let fixture: ComponentFixture<InventoryReportPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryReportPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryReportPageComponent);
    component = fixture.componentInstance;
  });

  it('creates the inventory report page', () => {
    expect(component).toBeTruthy();
  });

  it('starts with an empty branch list (loaded dynamically from API)', () => {
    const testable = component as unknown as TestableInventory;
    expect(testable.branchOptions()).toEqual([]);
  });

  it('uses a table definition for paginated low-stock results', () => {
    const testable = component as unknown as TestableInventory;
    expect(testable.lowStockColumns.map((column) => column.field)).toEqual([
      'primary',
      'secondary',
      'metric',
      'submetric',
    ]);
  });

  it('reflects branch changes through the computed options', () => {
    const testable = component as unknown as TestableInventory;
    testable.branches.set([{ id: 1, name: 'Sucursal Centro', address: '', phone: '' }]);
    fixture.detectChanges();
    const options = testable.branchOptions();
    expect(options.length).toBe(1);
    expect(options[0].label).toBe('Sucursal Centro');
    expect(options[0].value).toBe(1);
  });
});
