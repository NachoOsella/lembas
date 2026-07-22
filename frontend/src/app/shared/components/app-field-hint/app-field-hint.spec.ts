import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { AppFieldHint } from './app-field-hint';

describe('AppFieldHint', () => {
  let fixture: ComponentFixture<AppFieldHint>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AppFieldHint] }).compileComponents();
    fixture = TestBed.createComponent(AppFieldHint);
    fixture.detectChanges();
  });

  /** Should create the reusable field hint component. */
  it('Should_createComponent_when_instantiated', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
