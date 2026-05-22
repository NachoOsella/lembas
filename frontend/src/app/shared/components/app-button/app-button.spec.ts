import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppButton } from './app-button';

describe('AppButton', () => {
  let fixture: ComponentFixture<AppButton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppButton],
    }).compileComponents();

    fixture = TestBed.createComponent(AppButton);
    fixture.detectChanges();
  });

  /** Should create the shared button component. */
  it('Should_createComponent_when_instantiated', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  /** Should disable the button while loading to prevent duplicate actions. */
  it('Should_disableButton_when_loading', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
  });
});
