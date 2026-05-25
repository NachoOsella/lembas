import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppFormField } from './app-form-field';

describe('AppFormField', () => {
  let component: AppFormField;
  let fixture: ComponentFixture<AppFormField>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppFormField],
    }).compileComponents();

    fixture = TestBed.createComponent(AppFormField);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'Email');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
