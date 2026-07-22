import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { AppToggleSwitch } from './app-toggle-switch';

/** Tests the reusable Lembas toggle switch wrapper. */
describe('AppToggleSwitch', () => {
  let fixture: ComponentFixture<AppToggleSwitch>;
  let component: AppToggleSwitch;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AppToggleSwitch] }).compileComponents();

    fixture = TestBed.createComponent(AppToggleSwitch);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update checked model when the switch changes', () => {
    component['onCheckedChange'](true);

    expect(component.checked()).toBe(true);
  });

  it('should apply compact class when size is small', () => {
    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector('p-toggleswitch') as HTMLElement;

    expect(toggle.className).toContain('app-toggle-switch--sm');
  });
});
