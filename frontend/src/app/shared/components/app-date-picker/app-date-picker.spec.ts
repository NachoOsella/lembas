import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { AppDatePicker } from './app-date-picker';

describe('AppDatePicker', () => {
  let fixture: ComponentFixture<AppDatePicker>;
  let component: AppDatePicker;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AppDatePicker] }).compileComponents();

    fixture = TestBed.createComponent(AppDatePicker);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update value model on change', () => {
    const date = new Date(2026, 5, 15);
    component.value.set(date);

    expect(component.value()).toBe(date);
  });

  it('should apply custom date format', () => {
    fixture.componentRef.setInput('dateFormat', 'dd/mm/yy');
    fixture.detectChanges();

    expect(component.dateFormat()).toBe('dd/mm/yy');
  });
});
