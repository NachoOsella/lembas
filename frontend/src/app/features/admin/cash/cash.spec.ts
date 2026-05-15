import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Cash } from './cash';

describe('Cash', () => {
  let component: Cash;
  let fixture: ComponentFixture<Cash>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cash],
    }).compileComponents();

    fixture = TestBed.createComponent(Cash);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
