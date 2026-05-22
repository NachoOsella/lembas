import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Register } from './register';
import { Auth, AuthResponse, RegisterRequest } from '../../../core/services/auth';

describe('Register component', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let authService: Auth;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    authService = TestBed.inject(Auth);
    httpMock = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
  });

  /** Should create the component instance and inject dependencies. */
  it('Should_createComponent_when_instantiated', () => {
    expect(component).toBeTruthy();
    expect(authService).toBeTruthy();
  });

  /** Should render the current placeholder template. */
  it('Should_renderPlaceholder_when_componentLoaded', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('register works!');
  });
});
