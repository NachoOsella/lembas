import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AppSearchBar } from './app-search-bar';

describe('AppSearchBar', () => {
  let component: AppSearchBar;
  let fixture: ComponentFixture<AppSearchBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppSearchBar],
    }).compileComponents();

    fixture = TestBed.createComponent(AppSearchBar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
