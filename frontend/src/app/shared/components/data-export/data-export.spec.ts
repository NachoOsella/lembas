import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { DataExport, buildCsv, escapeCsv, sanitize, todayIso } from './data-export';

/**
 * Tests for the pure CSV helpers plus a thin component smoke test.
 */
describe('DataExport', () => {
  describe('escapeCsv', () => {
    it('wraps values containing commas in quotes', () => {
      expect(escapeCsv('hello, world')).toBe('"hello, world"');
    });

    it('escapes embedded quotes by doubling them', () => {
      expect(escapeCsv('say "hi"')).toBe('"say ""hi"""');
    });

    it('escapes newlines and carriage returns', () => {
      expect(escapeCsv('a\nb')).toBe('"a\nb"');
      expect(escapeCsv('a\rb')).toBe('"a\rb"');
    });

    it('returns the bare value when no escaping is required', () => {
      expect(escapeCsv('plain')).toBe('plain');
    });

    it('treats null as an empty string', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(escapeCsv(null as any)).toBe('');
    });
  });

  describe('sanitize', () => {
    it('keeps only alphanumeric, underscore and dash characters', () => {
      expect(sanitize('Top Products! 2026')).toBe('top_products_2026');
    });

    it('strips diacritics', () => {
      expect(sanitize('Reporte de Caja')).toBe('reporte_de_caja');
    });

    it('collapses consecutive separators', () => {
      expect(sanitize('hello___world')).toBe('hello_world');
    });
  });

  describe('todayIso', () => {
    it('returns a yyyy-MM-dd string', () => {
      expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('buildCsv', () => {
    it('produces a UTF-8 BOM and one header row', () => {
      const csv = buildCsv({
        filename: 'sample',
        columns: [
          { key: 'a', label: 'A' },
          { key: 'b', label: 'B' },
        ],
        rows: [{ a: '1', b: '2' }],
      });
      expect(csv.charCodeAt(0)).toBe(0xfeff);
      const lines = csv.slice(1).split('\n');
      expect(lines[0]).toBe('A,B');
      expect(lines[1]).toBe('1,2');
    });

    it('emits empty cells for missing values', () => {
      const csv = buildCsv({
        filename: 'sample',
        columns: [{ key: 'a', label: 'A' }],
        rows: [{ a: null as unknown as string }],
      });
      const lines = csv.slice(1).split('\n');
      expect(lines[1]).toBe('');
    });
  });

  describe('component', () => {
    it('renders a button and disables it when there are no rows', async () => {
      await TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          MessageService,
        ],
      }).compileComponents();

      const fixture = TestBed.createComponent(DataExport);
      fixture.componentRef.setInput('data', {
        filename: 'empty',
        columns: [{ key: 'a', label: 'A' }],
        rows: [],
      });
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button).toBeTruthy();
      expect(button.hasAttribute('disabled')).toBe(true);
    });
  });
});
