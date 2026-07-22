import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InventoryToolbar } from './inventory-toolbar';

describe('InventoryToolbar', () => {
  let component: InventoryToolbar;
  let fixture: ComponentFixture<InventoryToolbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryToolbar],
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryToolbar);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('branchOptions', [{ label: 'Centro', value: 20 }]);
    await fixture.whenStable();
  });

  it('renders the inventory search and branch filter controls', () => {
    expect(fixture.nativeElement.querySelector('app-search-bar')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-select')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.inventory-expiring-toggle')).toBeTruthy();
  });

  it('emits the normalized search input through the presentational output', async () => {
    const search = vi.fn();
    component.searchChanged.subscribe(search);
    const input = document.querySelector<HTMLInputElement>(
      'input[placeholder="Buscar por producto..."]',
    );

    expect(input).toBeTruthy();
    if (!input) {
      throw new Error('Inventory search input was not rendered.');
    }
    input.value = 'Granola';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await fixture.whenStable();

    expect(search).toHaveBeenCalledWith('Granola');
  });
});
