import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppStatCard } from './app-stat-card';

describe('AppStatCard', () => {
  let fixture: ComponentFixture<AppStatCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AppStatCard] }).compileComponents();
    fixture = TestBed.createComponent(AppStatCard);
    fixture.componentRef.setInput('metrics', [
      { label: 'Total', value: 4, detail: 'usuarios', icon: 'pi pi-users', tone: 'forest' },
    ]);
    fixture.detectChanges();
  });

  it('should render metric values', () => {
    expect(fixture.nativeElement.textContent).toContain('Total');
    expect(fixture.nativeElement.textContent).toContain('4');
  });
});
