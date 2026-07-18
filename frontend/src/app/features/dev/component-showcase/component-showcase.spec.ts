import { provideRouter } from '@angular/router';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';

import { ComponentShowcase } from './component-showcase';

describe('ComponentShowcase', () => {
  let component: ComponentShowcase;
  let fixture: ComponentFixture<ComponentShowcase>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentShowcase],
      providers: [provideRouter([]), MessageService],
    }).compileComponents();

    fixture = TestBed.createComponent(ComponentShowcase);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
