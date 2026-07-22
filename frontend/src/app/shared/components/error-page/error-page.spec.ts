import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { ErrorPage } from './error-page';

describe('ErrorPage', () => {
  let component: ErrorPage;
  let fixture: ComponentFixture<ErrorPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorPage, RouterTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ errorCode: '404' }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to 404 error code from route data', () => {
    expect(component.errorCode()).toBe('404');
  });

  it('should display 404 code and title', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('404');
    expect(compiled.textContent).toContain('No encontramos esta página');
  });

  it('should display 500 code and title when errorCodeInput is 500', () => {
    fixture.componentRef.setInput('errorCodeInput', '500');
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('500');
    expect(compiled.textContent).toContain('Algo salió mal');
  });

  it('should show action buttons', () => {
    const compiled = fixture.nativeElement;
    const buttons = compiled.querySelectorAll('a');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('should show suggestions for 404 error', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('¿Qué podés hacer?');
    expect(compiled.textContent).toContain('Ver catálogo');
    expect(compiled.textContent).toContain('Ir al inicio');
    expect(compiled.textContent).toContain('Mi cuenta');
  });

  it('should not show suggestions for 500 error', () => {
    fixture.componentRef.setInput('errorCodeInput', '500');
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.textContent).not.toContain('¿Qué podés hacer?');
  });
});
