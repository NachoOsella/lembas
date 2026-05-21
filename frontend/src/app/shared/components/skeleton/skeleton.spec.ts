import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  let component: Skeleton;
  let fixture: ComponentFixture<Skeleton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Skeleton],
    }).compileComponents();

    fixture = TestBed.createComponent(Skeleton);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply inputs correctly to element styles and classes', () => {
    fixture.componentRef.setInput('shape', 'circle');
    fixture.componentRef.setInput('width', '50px');
    fixture.componentRef.setInput('height', '50px');
    fixture.detectChanges();

    const element = fixture.nativeElement.querySelector('.skeleton-element');
    expect(element).toBeTruthy();
    expect(element.classList.contains('skeleton-circle')).toBe(true);
    expect(element.style.height).toBe('50px');
  });
});

