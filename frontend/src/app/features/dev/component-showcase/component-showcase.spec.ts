import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComponentShowcase } from './component-showcase';

describe('ComponentShowcase', () => {
  let component: ComponentShowcase;
  let fixture: ComponentFixture<ComponentShowcase>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentShowcase],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ComponentShowcase);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
