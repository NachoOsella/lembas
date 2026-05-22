import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  /** Creates the login component with the desired query-param state. */
  async function createComponent(registered: string | null = null): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(registered ? { registered } : {}),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  /** Should create the component instance. */
  it('Should_createComponent_when_instantiated', async () => {
    await createComponent();

    expect(component).toBeTruthy();
  });

  /** Should show the registration success message when redirected after signup. */
  it('Should_showRegistrationSuccessMessage_when_registeredQueryParamIsTrue', async () => {
    await createComponent('true');
    fixture.detectChanges();

    const message = fixture.nativeElement.querySelector('[data-testid="registration-success"]');

    expect(message).toBeTruthy();
    expect(message.textContent).toContain('Cuenta creada correctamente');
  });

  /** Should hide the registration success message during a normal login visit. */
  it('Should_hideRegistrationSuccessMessage_when_registeredQueryParamIsMissing', async () => {
    await createComponent();
    fixture.detectChanges();

    const message = fixture.nativeElement.querySelector('[data-testid="registration-success"]');

    expect(message).toBeNull();
  });
});
