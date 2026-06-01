import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppEyebrow } from './app-eyebrow';

describe('AppEyebrow', () => {
  let component: AppEyebrow;
  let fixture: ComponentFixture<AppEyebrow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppEyebrow],
    }).compileComponents();

    fixture = TestBed.createComponent(AppEyebrow);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render with default green color', () => {
    const el = fixture.nativeElement.querySelector('.app-eyebrow');
    expect(el.classList.contains('app-eyebrow--green')).toBe(true);
  });

  it('should apply light color class', () => {
    fixture.componentRef.setInput('color', 'light');
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('.app-eyebrow');
    expect(el.classList.contains('app-eyebrow--light')).toBe(true);
  });

  it('should apply bark color class', () => {
    fixture.componentRef.setInput('color', 'bark');
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('.app-eyebrow');
    expect(el.classList.contains('app-eyebrow--bark')).toBe(true);
  });

  it('should project content', () => {
    fixture = TestBed.createComponent(AppEyebrow);
    fixture.componentRef.setInput('color', 'green');
    fixture.nativeElement.textContent = 'Test Label';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Test Label');
  });
});
