import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppDataTable, ColumnDef } from './app-data-table';

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
});
