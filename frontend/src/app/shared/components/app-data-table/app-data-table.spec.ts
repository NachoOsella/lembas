import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { ColumnDef } from './app-data-table';
import { AppDataTable } from './app-data-table';

interface TestRow {
  name: string;
  price: number;
}

describe('AppDataTable', () => {
  let component: AppDataTable;
  let fixture: ComponentFixture<AppDataTable>;

  const columns: ColumnDef[] = [
    { field: 'name', header: 'Nombre', sortable: true },
    { field: 'price', header: 'Precio', sortable: true },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppDataTable],
    }).compileComponents();

    fixture = TestBed.createComponent(AppDataTable);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('data', [
      { name: 'Granola', price: 1200 },
      { name: 'Miel', price: 850 },
    ]);
    fixture.componentRef.setInput('columns', columns);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('updates the active page size when the paginator selection changes', () => {
    component['onPageChange']({ first: 10, rows: 20, page: 1, pageCount: 3 });

    expect(component.first()).toBe(10);
    expect(component.rows()).toBe(20);
  });
});
