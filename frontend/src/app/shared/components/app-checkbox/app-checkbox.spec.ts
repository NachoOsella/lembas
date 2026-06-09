import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppCheckbox } from './app-checkbox';

describe('AppCheckbox', () => {
  let fixture: ComponentFixture<AppCheckbox>;
  let component: AppCheckbox;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AppCheckbox] }).compileComponents();

    fixture = TestBed.createComponent(AppCheckbox);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update value model on change', () => {
    component.value.set(true);

    expect(component.value()).toBe(true);
  });

  it('should display label text when provided', () => {
    fixture.componentRef.setInput('label', 'Test label');
    fixture.detectChanges();

    const labelEl = fixture.nativeElement.querySelector('.app-checkbox__label');

    expect(labelEl.textContent).toContain('Test label');
  });
});
