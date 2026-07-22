import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { LegalContentService } from '@features/catalog/data-access/legal-content';
import type { FaqDocument } from '@features/catalog/domain/legal-content';
import { FaqPage } from './faq-page';

/** Builds a populated FAQ document used by the tests. */
function buildFaq(overrides: Partial<FaqDocument> = {}): FaqDocument {
  return {
    title: 'Preguntas frecuentes',
    intro: 'Intro FAQ.',
    items: [
      {
        id: 'como-comprar',
        question: 'Como hago un pedido?',
        answer: 'Respuesta 1.',
        category: 'Pedidos',
      },
      {
        id: 'medios-de-pago',
        question: 'Que medios de pago aceptan?',
        answer: 'Respuesta 2.',
        category: 'Pagos',
      },
      {
        id: 'elegir-sucursal',
        question: 'Puedo elegir la sucursal de retiro?',
        answer: 'Respuesta 3.',
        category: 'Retiro',
      },
    ],
    ...overrides,
  };
}

/** Type-safe helper for reading protected signals in tests. */
function expose(component: FaqPage): Record<string, unknown> {
  return component as unknown as Record<string, unknown>;
}

describe('FaqPage', () => {
  let fixture: ComponentFixture<FaqPage>;
  let component: FaqPage;
  let legalContent: { getFaq: ReturnType<typeof vi.fn> };

  /** Configures TestBed with a mocked legal content service. */
  async function configure(faq: FaqDocument | null = buildFaq()): Promise<void> {
    legalContent = {
      getFaq: vi.fn().mockReturnValue(faq ? of(faq) : throwError(() => new Error('boom'))),
    };

    await TestBed.configureTestingModule({
      imports: [FaqPage],
      providers: [provideRouter([]), { provide: LegalContentService, useValue: legalContent }],
    }).compileComponents();

    fixture = TestBed.createComponent(FaqPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load the FAQ document', async () => {
    await configure();

    expect(component).toBeTruthy();
    expect(legalContent.getFaq).toHaveBeenCalledTimes(1);
    expect((expose(component)['faq'] as () => FaqDocument | null)()).toEqual(buildFaq());
    expect((expose(component)['loading'] as () => boolean)()).toBe(false);
  });

  it('should render the document title, intro and a panel per item', async () => {
    await configure();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Preguntas frecuentes');
    expect(text).toContain('Intro FAQ.');
    expect(text).toContain('Como hago un pedido?');
    expect(text).toContain('Que medios de pago aceptan?');
    expect(text).toContain('Puedo elegir la sucursal de retiro?');

    const panels = fixture.nativeElement.querySelectorAll('p-panel');
    expect(panels.length).toBe(3);
  });

  it('should render every FAQ panel collapsed by default', async () => {
    await configure();

    // The intro is always visible, but the answers must be hidden until the
    // user toggles the panel. PrimeNG emits the `p-panel-collapsed` class
    // on the host element when the panel is closed.
    const panels = Array.from(fixture.nativeElement.querySelectorAll('p-panel')) as HTMLElement[];

    expect(panels.length).toBe(3);
    for (const panel of panels) {
      expect(panel.classList.contains('p-panel-collapsed')).toBe(true);
      expect(panel.classList.contains('p-panel-expanded')).toBe(false);
    }

    // The first answer should not be in the rendered text until the user expands.
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Como hago un pedido?');
    expect(text).not.toContain('Desde el catalogo, agregas los productos al carrito');
  });

  it('should group items by category and render a heading per group', async () => {
    await configure();

    const groupTitles = Array.from(fixture.nativeElement.querySelectorAll('.faq-group__title')).map(
      (el) => (el as HTMLElement).textContent?.trim(),
    );

    expect(groupTitles).toEqual(['Pedidos', 'Pagos', 'Retiro']);
  });

  it('should use the design-system transition (300ms cubic-bezier)', async () => {
    await configure();

    expect(expose(component)['transitionOptions'] as string).toBe(
      '300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    );
  });

  it('should show the error alert when the service fails', async () => {
    await configure(null);

    const error = fixture.nativeElement.querySelector('app-error-alert');
    expect(error).toBeTruthy();
    expect((expose(component)['error'] as () => boolean)()).toBe(true);
  });

  it('should retry loading the document when the user clicks retry', async () => {
    legalContent = {
      getFaq: vi
        .fn()
        .mockReturnValueOnce(throwError(() => new Error('boom')))
        .mockReturnValueOnce(of(buildFaq())),
    };

    await TestBed.configureTestingModule({
      imports: [FaqPage],
      providers: [provideRouter([]), { provide: LegalContentService, useValue: legalContent }],
    }).compileComponents();

    fixture = TestBed.createComponent(FaqPage);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect((expose(component)['error'] as () => boolean)()).toBe(true);
    expect(legalContent.getFaq).toHaveBeenCalledTimes(1);

    (component as unknown as { retry: () => void }).retry();
    fixture.detectChanges();

    expect(legalContent.getFaq).toHaveBeenCalledTimes(2);
    expect((expose(component)['error'] as () => boolean)()).toBe(false);
  });

  it('should keep the groups in the order they first appear in the document', async () => {
    const reordered = buildFaq({
      items: [
        {
          id: 'pagos-1',
          question: 'Pago 1',
          answer: 'Respuesta pago 1',
          category: 'Pagos',
        },
        {
          id: 'pedidos-1',
          question: 'Pedido 1',
          answer: 'Respuesta pedido 1',
          category: 'Pedidos',
        },
      ],
    });
    await configure(reordered);

    const groupTitles = Array.from(fixture.nativeElement.querySelectorAll('.faq-group__title')).map(
      (el) => (el as HTMLElement).textContent?.trim(),
    );

    expect(groupTitles).toEqual(['Pagos', 'Pedidos']);
  });
});
