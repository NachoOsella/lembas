import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { AppInputNumber } from './app-input-number';

describe('AppInputNumber', () => {
  let fixture: ComponentFixture<AppInputNumber>;
  let component: AppInputNumber;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AppInputNumber] }).compileComponents();

    fixture = TestBed.createComponent(AppInputNumber);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update value model on change', () => {
    component.value.set(42);

    expect(component.value()).toBe(42);
  });

  it('should apply currency mode when set', () => {
    fixture.componentRef.setInput('mode', 'currency');
    fixture.componentRef.setInput('currency', 'USD');
    fixture.detectChanges();

    expect(component.mode()).toBe('currency');
    expect(component.currency()).toBe('USD');
  });
});
