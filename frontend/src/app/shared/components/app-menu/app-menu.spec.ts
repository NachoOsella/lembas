import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppMenu } from './app-menu';
import { MenuItem } from 'primeng/api';

describe('AppMenu', () => {
  let fixture: ComponentFixture<AppMenu>;
  let component: AppMenu;

  const mockItems: MenuItem[] = [
    { label: 'Item 1', command: () => undefined },
    { label: 'Item 2', command: () => undefined },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AppMenu] }).compileComponents();

    fixture = TestBed.createComponent(AppMenu);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('model', mockItems);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should accept model items', () => {
    fixture.componentRef.setInput('model', mockItems);
    fixture.detectChanges();

    expect(component.model()).toEqual(mockItems);
  });

  it('should toggle popup mode', () => {
    fixture.componentRef.setInput('popup', true);
    fixture.detectChanges();

    expect(component.popup()).toBe(true);
  });
});
