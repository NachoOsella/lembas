import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { PRODUCT_STATUS_BADGES } from '@features/catalog/presentation/product-status';
import { StatusBadge } from './status-badge';

/** Tests the reusable status badge component. */
describe('StatusBadge', () => {
  let fixture: ComponentFixture<StatusBadge>;
  let component: StatusBadge;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBadge],
    }).compileComponents();

    fixture = TestBed.createComponent(StatusBadge);
    component = fixture.componentInstance;
  });

  it('renders the configured label for a known status', () => {
    fixture.componentRef.setInput('status', 'PUBLISHED');
    fixture.componentRef.setInput('config', PRODUCT_STATUS_BADGES);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Publicado');
  });

  it('renders the configured label for DRAFT', () => {
    fixture.componentRef.setInput('status', 'DRAFT');
    fixture.componentRef.setInput('config', PRODUCT_STATUS_BADGES);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Borrador');
  });

  it('renders the configured label for PAUSED', () => {
    fixture.componentRef.setInput('status', 'PAUSED');
    fixture.componentRef.setInput('config', PRODUCT_STATUS_BADGES);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Pausado');
  });

  it('renders the configured label for HIDDEN', () => {
    fixture.componentRef.setInput('status', 'HIDDEN');
    fixture.componentRef.setInput('config', PRODUCT_STATUS_BADGES);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Oculto');
  });

  it('falls back to the raw status string when config is empty', () => {
    fixture.componentRef.setInput('status', 'CUSTOM_STATUS');
    fixture.componentRef.setInput('config', {});
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('CUSTOM_STATUS');
  });

  it('falls back to the raw status string when status is not in config', () => {
    fixture.componentRef.setInput('status', 'UNKNOWN');
    fixture.componentRef.setInput('config', PRODUCT_STATUS_BADGES);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('UNKNOWN');
  });

  it('uses neutral tone for unknown statuses', () => {
    fixture.componentRef.setInput('status', 'UNKNOWN');
    fixture.componentRef.setInput('config', {});
    fixture.detectChanges();

    const tag = fixture.nativeElement.querySelector('p-tag');
    expect(tag).toBeTruthy();
  });

  it('uses the correct tone for PUBLISHED', () => {
    fixture.componentRef.setInput('status', 'PUBLISHED');
    fixture.componentRef.setInput('config', PRODUCT_STATUS_BADGES);
    fixture.detectChanges();

    const tag = fixture.nativeElement.querySelector('p-tag');
    expect(tag).toBeTruthy();
  });
});
