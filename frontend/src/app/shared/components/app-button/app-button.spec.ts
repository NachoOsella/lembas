import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppButton } from './app-button';

@Component({
  imports: [AppButton],
  template: '<app-button routerLink="/auth/login">Ingresar</app-button>',
})
class LinkButtonHost {}

describe('AppButton', () => {
  let fixture: ComponentFixture<AppButton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppButton, LinkButtonHost],
      providers: [provideRouter([])],
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

  /** Should add icon-only class when iconOnly is true. */
  it('Should_addIconOnlyClass_when_iconOnlyIsTrue', () => {
    fixture.componentRef.setInput('icon', 'pi pi-check');
    fixture.componentRef.setInput('iconOnly', true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.classList.contains('app-button--icon-only')).toBe(true);
  });

  /** Should not render the label span when iconOnly is true. */
  it('Should_hideLabelSpan_when_iconOnlyIsTrue', () => {
    fixture.componentRef.setInput('icon', 'pi pi-check');
    fixture.componentRef.setInput('iconOnly', true);
    fixture.detectChanges();

    const span = fixture.nativeElement.querySelector('span[pbuttonlabel]');
    expect(span).toBeNull();
  });

  /** Should render the label span when iconOnly is false. */
  it('Should_showLabelSpan_when_iconOnlyIsFalse', () => {
    fixture.componentRef.setInput('icon', 'pi pi-check');
    fixture.componentRef.setInput('iconOnly', false);
    fixture.detectChanges();

    const span = fixture.nativeElement.querySelector('span[pbuttonlabel]');
    expect(span).not.toBeNull();
  });

  /** Should project the consumer label when rendering as a router link. */
  it('Should_showProjectedLabel_when_routerLinkIsUsed', async () => {
    const hostFixture = TestBed.createComponent(LinkButtonHost);
    hostFixture.detectChanges();

    const link = hostFixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('Ingresar');
  });
});
