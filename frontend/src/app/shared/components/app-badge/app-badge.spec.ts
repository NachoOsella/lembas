import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppBadge } from './app-badge';

describe('AppBadge', () => {
  let fixture: ComponentFixture<AppBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AppBadge] }).compileComponents();
    fixture = TestBed.createComponent(AppBadge);
    fixture.detectChanges();
  });

  /** Should create the reusable badge component. */
  it('Should_createComponent_when_instantiated', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
