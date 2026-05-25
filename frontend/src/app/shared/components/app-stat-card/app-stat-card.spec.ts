import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppStatCard } from './app-stat-card';

describe('AppStatCard', () => {
  let component: AppStatCard;
  let fixture: ComponentFixture<AppStatCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppStatCard],
    }).compileComponents();

    fixture = TestBed.createComponent(AppStatCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('value', '$12.450');
    fixture.componentRef.setInput('label', 'Ventas hoy');
    fixture.componentRef.setInput('icon', 'pi pi-shopping-cart');
    fixture.componentRef.setInput('trend', 'up');
    fixture.componentRef.setInput('trendValue', '+12%');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
