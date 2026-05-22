import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppPageHeader } from './app-page-header';

describe('AppPageHeader', () => {
  let fixture: ComponentFixture<AppPageHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AppPageHeader] }).compileComponents();
    fixture = TestBed.createComponent(AppPageHeader);
    fixture.componentRef.setInput('title', 'Titulo de prueba');
    fixture.detectChanges();
  });

  /** Should create the reusable page header component. */
  it('Should_createComponent_when_instantiated', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
