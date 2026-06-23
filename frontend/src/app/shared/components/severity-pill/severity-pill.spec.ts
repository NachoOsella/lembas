import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeverityPill } from './severity-pill';

@Component({
  standalone: true,
  imports: [SeverityPill],
  template: `<app-severity-pill [tone]="tone">PAID</app-severity-pill>`,
})
class HostPillComponent {
  tone: 'success' | 'warn' | 'danger' | 'neutral' = 'neutral';
}

describe('SeverityPill', () => {
  let fixture: ComponentFixture<HostPillComponent>;

  async function configure(tone: 'success' | 'warn' | 'danger' | 'neutral' = 'neutral'): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [HostPillComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostPillComponent);
    fixture.componentInstance.tone = tone;
    fixture.detectChanges();
  }

  it('uses the design-system success palette when tone=success', async () => {
    await configure('success');
    const span = fixture.nativeElement.querySelector('span');
    expect(span.className).toContain('bg-mint-wash');
    expect(span.className).toContain('text-primary');
  });

  it('uses the design-system warn palette when tone=warn', async () => {
    await configure('warn');
    const span = fixture.nativeElement.querySelector('span');
    expect(span.className).toContain('bg-amber-tint');
    expect(span.className).toContain('text-amber-text');
  });

  it('uses the design-system danger palette when tone=danger', async () => {
    await configure('danger');
    const span = fixture.nativeElement.querySelector('span');
    expect(span.className).toContain('bg-red-tint');
    expect(span.className).toContain('text-red');
  });

  it('falls back to the neutral palette when tone is unknown', async () => {
    await configure('neutral');
    const span = fixture.nativeElement.querySelector('span');
    expect(span.className).toContain('bg-surface-warm');
    expect(span.className).toContain('text-text-muted');
  });

  it('renders the projected content', async () => {
    await configure('success');
    expect(fixture.nativeElement.textContent).toContain('PAID');
  });
});
