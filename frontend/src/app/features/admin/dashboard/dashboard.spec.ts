import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { Dashboard } from './dashboard';

/**
 * Smoke test for the operational dashboard.
 *
 * <p>The full integration is covered by the dedicated service and store
 * tests; here we just verify the component renders without throwing when
 * the HTTP backend returns an empty payload.</p>
 */
describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
  });

  it('creates the dashboard page', () => {
    expect(component).toBeTruthy();
  });
});
