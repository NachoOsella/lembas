import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Carousel } from 'primeng/carousel';

import { AppCarousel } from './app-carousel';

// ---------------------------------------------------------------------------
// Host component for integration testing
// ---------------------------------------------------------------------------
interface TestItem {
  readonly id: number;
  readonly label: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [AppCarousel],
  template: `
    <app-carousel
      [value]="items()"
      [numVisible]="numVisible()"
      [numScroll]="numScroll()"
      [circular]="circular()"
      [autoplayInterval]="autoplayInterval()"
      [showIndicators]="showIndicators()"
      [showNavigators]="showNavigators()"
      [headerText]="headerText()"
      (pageChange)="onPageChange($event)"
    >
      <ng-template #item let-item>
        <div class="test-item">{{ item.label }}</div>
      </ng-template>
    </app-carousel>
  `,
})
class HostComponent {
  readonly items = signal<TestItem[]>([
    { id: 1, label: 'Item 1' },
    { id: 2, label: 'Item 2' },
    { id: 3, label: 'Item 3' },
  ]);

  readonly numVisible = signal(1);
  readonly numScroll = signal(1);
  readonly circular = signal(false);
  readonly autoplayInterval = signal(0);
  readonly showIndicators = signal(true);
  readonly showNavigators = signal(true);
  readonly headerText = signal('');

  page = 0;

  onPageChange(event: { page: number }): void {
    this.page = event.page;
  }
}

// ---------------------------------------------------------------------------
// Specs
// ---------------------------------------------------------------------------
describe('AppCarousel', () => {
  async function setup(): Promise<{
    fixture: ComponentFixture<HostComponent>;
    host: HostComponent;
    carouselEl: AppCarousel;
  }> {
    await TestBed.configureTestingModule({
      imports: [HostComponent, AppCarousel],
    }).compileComponents();

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const carouselEl = fixture.debugElement.query(By.directive(AppCarousel))
      ?.componentInstance as AppCarousel;

    return { fixture, host: fixture.componentInstance, carouselEl };
  }

  it('should create the wrapper component', async () => {
    const { carouselEl } = await setup();
    expect(carouselEl).toBeTruthy();
  });

  it('should render the p-carousel with the correct value', async () => {
    const { fixture } = await setup();
    const pCarousel = fixture.debugElement.query(By.directive(Carousel));

    expect(pCarousel).toBeTruthy();
    expect(pCarousel.componentInstance.value).toEqual([
      { id: 1, label: 'Item 1' },
      { id: 2, label: 'Item 2' },
      { id: 3, label: 'Item 3' },
    ]);
  });

  it('should render items via the template', async () => {
    const { fixture } = await setup();
    fixture.detectChanges();

    const itemEls = fixture.debugElement.queryAll(By.css('.test-item'));
    expect(itemEls.length).toBe(3);
    expect(itemEls[0].nativeElement.textContent).toContain('Item 1');
    expect(itemEls[1].nativeElement.textContent).toContain('Item 2');
    expect(itemEls[2].nativeElement.textContent).toContain('Item 3');
  });

  it('should forward numVisible and numScroll to p-carousel', async () => {
    const { fixture, host } = await setup();
    host.numVisible.set(2);
    host.numScroll.set(2);
    fixture.detectChanges();
    await fixture.whenStable();

    const pCarousel = fixture.debugElement.query(By.directive(Carousel));
    expect(pCarousel.componentInstance.numVisible).toBe(2);
    expect(pCarousel.componentInstance.numScroll).toBe(2);
  });

  it('should forward circular and autoplayInterval to p-carousel', async () => {
    const { fixture, host } = await setup();
    host.circular.set(true);
    host.autoplayInterval.set(3000);
    fixture.detectChanges();
    await fixture.whenStable();

    const pCarousel = fixture.debugElement.query(By.directive(Carousel));
    expect(pCarousel.componentInstance.circular).toBe(true);
    expect(pCarousel.componentInstance.autoplayInterval).toBe(3000);
  });

  it('should emit pageChange when the p-carousel page changes', async () => {
    const { fixture, host } = await setup();
    const pCarousel = fixture.debugElement.query(By.directive(Carousel));

    // Simulate a page change event from p-carousel
    pCarousel.componentInstance.onPage.emit({ page: 2 });
    fixture.detectChanges();

    expect(host.page).toBe(2);
  });

  it('should hide navigators and indicators when disabled', async () => {
    const { fixture, host } = await setup();
    host.showIndicators.set(false);
    host.showNavigators.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    const pCarousel = fixture.debugElement.query(By.directive(Carousel));
    expect(pCarousel.componentInstance.showIndicators).toBe(false);
    expect(pCarousel.componentInstance.showNavigators).toBe(false);
  });

  it('should show header text when headerText is provided', async () => {
    const { fixture, host } = await setup();
    host.headerText.set('Recomendados');
    fixture.detectChanges();

    const headerEl = fixture.debugElement.query(By.css('.app-carousel__header-text'));
    expect(headerEl).toBeTruthy();
    expect(headerEl.nativeElement.textContent).toContain('Recomendados');
  });

  it('should not show header when headerText is empty', async () => {
    const { fixture } = await setup();
    fixture.detectChanges();

    const headerEl = fixture.debugElement.query(By.css('.app-carousel__header'));
    expect(headerEl).toBeFalsy();
  });

  it('should update when the value array changes', async () => {
    const { fixture, host } = await setup();
    host.items.set([{ id: 4, label: 'Item 4' }]);
    fixture.detectChanges();
    await fixture.whenStable();

    const itemEls = fixture.debugElement.queryAll(By.css('.test-item'));
    expect(itemEls.length).toBe(1);
    expect(itemEls[0].nativeElement.textContent).toContain('Item 4');
  });

  it('should set orientation and verticalViewPortHeight', async () => {
    const { fixture, host } = await setup();
    host.numVisible.set(1);
    fixture.detectChanges();
    await fixture.whenStable();

    const pCarousel = fixture.debugElement.query(By.directive(Carousel));
    expect(pCarousel.componentInstance.orientation).toBe('horizontal');
  });
});
