import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppMetricStrip } from './app-metric-strip';

describe('AppMetricStrip', () => {
  let fixture: ComponentFixture<AppMetricStrip>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AppMetricStrip] }).compileComponents();
    fixture = TestBed.createComponent(AppMetricStrip);
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
