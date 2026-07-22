import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { CardBanner } from './app-card-banner';

describe('CardBanner', () => {
  let fixture: ComponentFixture<CardBanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardBanner],
    }).compileComponents();

    fixture = TestBed.createComponent(CardBanner);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render content via projection', () => {
    const banner = fixture.nativeElement.querySelector('.card-banner');
    expect(banner).toBeTruthy();
  });

  it('should render blob by default', () => {
    const blob = fixture.nativeElement.querySelector('.card-banner__blob');
    expect(blob).toBeTruthy();
  });

  it('should apply default blob position classes', () => {
    const blob = fixture.nativeElement.querySelector('.card-banner__blob');
    expect(blob.classList.contains('-right-10')).toBe(true);
    expect(blob.classList.contains('-top-10')).toBe(true);
  });

  it('should have card-banner class', () => {
    const card = fixture.nativeElement.querySelector('.card-banner');
    expect(card).toBeTruthy();
  });

  it('should have relative positioning for blob', () => {
    const card = fixture.nativeElement.querySelector('.card-banner');
    expect(getComputedStyle(card).position).toBe('relative');
  });

  it('should have overflow hidden', () => {
    const card = fixture.nativeElement.querySelector('.card-banner');
    expect(getComputedStyle(card).overflow).toBe('hidden');
  });
});

describe('CardBanner - with different inputs', () => {
  it('should hide blob when showBlob is false', async () => {
    await TestBed.configureTestingModule({
      imports: [CardBanner],
    }).compileComponents();

    const fixture = TestBed.createComponent(CardBanner);
    fixture.componentRef.setInput('showBlob', false);
    fixture.detectChanges();

    const blob = fixture.nativeElement.querySelector('.card-banner__blob');
    expect(blob).toBeFalsy();
  });

  it('should apply bottom-left blob position', async () => {
    await TestBed.configureTestingModule({
      imports: [CardBanner],
    }).compileComponents();

    const fixture = TestBed.createComponent(CardBanner);
    fixture.componentRef.setInput('blobPosition', 'bottom-left');
    fixture.detectChanges();

    const blob = fixture.nativeElement.querySelector('.card-banner__blob');
    expect(blob.classList.contains('-left-10')).toBe(true);
    expect(blob.classList.contains('-bottom-10')).toBe(true);
  });

  it('should apply clickable class', async () => {
    await TestBed.configureTestingModule({
      imports: [CardBanner],
    }).compileComponents();

    const fixture = TestBed.createComponent(CardBanner);
    fixture.componentRef.setInput('clickable', true);
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.card-banner');
    expect(card.classList.contains('card-banner--clickable')).toBe(true);
  });

  it('should apply custom background color', async () => {
    await TestBed.configureTestingModule({
      imports: [CardBanner],
    }).compileComponents();

    const fixture = TestBed.createComponent(CardBanner);
    fixture.componentRef.setInput('bgColor', '#f6ead6');
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.card-banner');
    expect(card.style.backgroundColor).toBe('rgb(246, 234, 214)');
  });

  it('should apply custom border radius', async () => {
    await TestBed.configureTestingModule({
      imports: [CardBanner],
    }).compileComponents();

    const fixture = TestBed.createComponent(CardBanner);
    fixture.componentRef.setInput('borderRadius', '1rem');
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.card-banner');
    expect(card.style.borderRadius).toBe('1rem');
  });

  it('should apply custom padding', async () => {
    await TestBed.configureTestingModule({
      imports: [CardBanner],
    }).compileComponents();

    const fixture = TestBed.createComponent(CardBanner);
    fixture.componentRef.setInput('padding', '1.5rem');
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.card-banner');
    expect(card.style.padding).toBe('1.5rem');
  });
});
