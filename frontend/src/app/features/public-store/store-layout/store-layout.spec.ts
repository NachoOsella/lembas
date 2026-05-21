import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StoreLayout } from './store-layout';

describe('StoreLayout', () => {
  let component: StoreLayout;
  let fixture: ComponentFixture<StoreLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StoreLayout],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(StoreLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
