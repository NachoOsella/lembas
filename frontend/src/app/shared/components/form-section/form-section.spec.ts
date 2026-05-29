import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';

import { FormSection } from './form-section';

@Component({
  standalone: true,
  imports: [FormSection],
  template: `
    <app-form-section [index]="1" title="Seccion uno" description="Descripcion de ejemplo">
      <p data-testid="slot-content">Contenido proyectado</p>
    </app-form-section>
  `,
})
class WrapperComponent {}

/** Tests the generic FormSection component rendering and content projection. */
describe('FormSection', () => {
  let fixture: ComponentFixture<WrapperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WrapperComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WrapperComponent);
    fixture.detectChanges();
  });

  it('renders the section index as a two-digit badge', () => {
    const badge = fixture.nativeElement.querySelector('.form-section__index');
    expect(badge).toBeTruthy();
    expect(badge.textContent.trim()).toBe('1');
  });

  it('renders the section title', () => {
    const title = fixture.nativeElement.querySelector('.form-section__title');
    expect(title).toBeTruthy();
    expect(title.textContent.trim()).toBe('Seccion uno');
  });

  it('renders the section description', () => {
    const desc = fixture.nativeElement.querySelector('.form-section__description');
    expect(desc).toBeTruthy();
    expect(desc.textContent.trim()).toBe('Descripcion de ejemplo');
  });

  it('projects content inside the section body', () => {
    const slot = fixture.nativeElement.querySelector('[data-testid="slot-content"]');
    expect(slot).toBeTruthy();
    expect(slot.textContent.trim()).toBe('Contenido proyectado');
  });

  it('hides description when none is provided', async () => {
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [FormSection],
    }).compileComponents();

    const noDescFixture = TestBed.createComponent(FormSection);
    noDescFixture.componentRef.setInput('index', 2);
    noDescFixture.componentRef.setInput('title', 'Sin descripcion');
    noDescFixture.detectChanges();

    const desc = noDescFixture.nativeElement.querySelector('.form-section__description');
    expect(desc).toBeNull();
  });

  it('has correct CSS class structure for styling', () => {
    const section = fixture.nativeElement.querySelector('.form-section');
    expect(section).toBeTruthy();
    expect(section.classList.contains('form-section')).toBe(true);
  });
});
