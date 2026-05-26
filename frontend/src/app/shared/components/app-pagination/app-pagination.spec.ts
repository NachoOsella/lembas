import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppPagination } from './app-pagination';

describe('AppPagination', () => {
  let component: AppPagination;
  let fixture: ComponentFixture<AppPagination>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppPagination],
    }).compileComponents();

    fixture = TestBed.createComponent(AppPagination);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('totalRecords', 100);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
