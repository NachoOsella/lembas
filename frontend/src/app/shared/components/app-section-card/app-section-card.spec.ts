import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppSectionCard } from './app-section-card';

describe('AppSectionCard', () => {
  let fixture: ComponentFixture<AppSectionCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AppSectionCard] }).compileComponents();
    fixture = TestBed.createComponent(AppSectionCard);
    fixture.detectChanges();
  });

  /** Should create the reusable section card component. */
  it('Should_createComponent_when_instantiated', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
