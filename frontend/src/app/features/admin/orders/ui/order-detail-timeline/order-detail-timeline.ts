import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { AdminTimelineStep } from '@features/orders/public-api';
import { ShortDateArPipe } from '@core/pipes/short-date-ar.pipe';

@Component({
  selector: 'app-order-detail-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ShortDateArPipe],
  templateUrl: './order-detail-timeline.html',
  styleUrl: './order-detail-timeline.css',
})
export class OrderDetailTimeline {
  readonly steps = input.required<AdminTimelineStep[]>();
}
