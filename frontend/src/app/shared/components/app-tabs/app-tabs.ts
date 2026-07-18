import { Component, input, model, output, ChangeDetectionStrategy } from '@angular/core';

export interface TabItem {
  readonly label: string;
  readonly icon?: string;
  readonly disabled?: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-tabs',
  imports: [],
  templateUrl: './app-tabs.html',
  styleUrl: './app-tabs.css',
})
export class AppTabs {
  readonly items = input.required<TabItem[]>();
  readonly activeIndex = model(0);
  readonly scrollable = input(false);

  readonly tabChange = output<number>();

  protected onTabClick(index: number, item: TabItem): void {
    if (item.disabled) return;
    this.activeIndex.set(index);
    this.tabChange.emit(index);
  }
}
