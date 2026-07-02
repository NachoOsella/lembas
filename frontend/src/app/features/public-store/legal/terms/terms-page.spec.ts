import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { LegalContentService } from '../../../../core/services/legal-content';
import { TermsDocument } from '../../../../shared/models/legal-content';
import { TermsPage } from './terms-page';

/** Builds a populated terms document used by the tests. */
function buildTerms(overrides: Partial<TermsDocument> = {}): TermsDocument {
  return {
    title: 'Terminos y Condiciones',
    lastUpdated: '2026-06-01',
    intro: 'Intro del documento.',
    sections: [
      {
        title: '1. Informacion general',
        paragraphs: ['Parrafo uno.', 'Parrafo dos.'],
        bullets: ['Bullet a', 'Bullet b'],
      },
      {
        title: '2. Registro y cuenta',
        paragraphs: ['Parrafo de registro.'],
        bullets: [],
      },
    ],
    ...overrides,
  };
}

/** Type-safe helper for reading protected signals in tests. */
function expose(component: TermsPage): Record<string, unknown> {
  return component as unknown as Record<string, unknown>;
}

describe('TermsPage', () => {
  let fixture: ComponentFixture<TermsPage>;
  let component: TermsPage;
  let legalContent: { getTerms: ReturnType<typeof vi.fn> };

  /** Configures TestBed with a mocked legal content service. */
  async function configure(terms: TermsDocument | null = buildTerms()): Promise<void> {
    legalContent = {
      getTerms: vi.fn().mockReturnValue(terms ? of(terms) : throwError(() => new Error('boom'))),
    };

    await TestBed.configureTestingModule({
      imports: [TermsPage],
      providers: [
        provideRouter([]),
        { provide: LegalContentService, useValue: legalContent },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TermsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load the terms document', async () => {
    await configure();

    expect(component).toBeTruthy();
    expect(legalContent.getTerms).toHaveBeenCalledTimes(1);
    expect((expose(component)['terms'] as () => TermsDocument | null)()).toEqual(buildTerms());
    expect((expose(component)['loading'] as () => boolean)()).toBe(false);
  });

  it('should render the document title, intro and every section', async () => {
    await configure();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Terminos y Condiciones');
    expect(text).toContain('Intro del documento.');
    expect(text).toContain('1. Informacion general');
    expect(text).toContain('Parrafo uno.');
    expect(text).toContain('Parrafo dos.');
    expect(text).toContain('Bullet a');
    expect(text).toContain('Bullet b');
    expect(text).toContain('2. Registro y cuenta');
  });

  it('should show the last-updated date formatted as DD/MM/YYYY', async () => {
    await configure();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('01/06/2026');
  });

  it('should hide the intro paragraph when the document has no intro', async () => {
    await configure(buildTerms({ intro: '' }));

    const documentEl = fixture.nativeElement.querySelector('.terms-document');
    const text = (documentEl?.textContent ?? '').toString();
    // The section paragraph should be present but the intro paragraph omitted.
    expect(text).toContain('Parrafo uno.');
    expect(text).not.toContain('Intro del documento.');
  });

  it('should show the error alert when the service fails', async () => {
    await configure(null);

    const error = fixture.nativeElement.querySelector('app-error-alert');
    expect(error).toBeTruthy();
    expect((expose(component)['error'] as () => boolean)()).toBe(true);
    expect((expose(component)['loading'] as () => boolean)()).toBe(false);
  });

  it('should retry loading the document when the user clicks retry', async () => {
    legalContent = {
      getTerms: vi
        .fn()
        .mockReturnValueOnce(throwError(() => new Error('boom')))
        .mockReturnValueOnce(of(buildTerms())),
    };

    await TestBed.configureTestingModule({
      imports: [TermsPage],
      providers: [
        provideRouter([]),
        { provide: LegalContentService, useValue: legalContent },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TermsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect((expose(component)['error'] as () => boolean)()).toBe(true);
    expect(legalContent.getTerms).toHaveBeenCalledTimes(1);

    (component as unknown as { retry: () => void }).retry();
    fixture.detectChanges();

    expect(legalContent.getTerms).toHaveBeenCalledTimes(2);
    expect((expose(component)['error'] as () => boolean)()).toBe(false);
    expect((expose(component)['loading'] as () => boolean)()).toBe(false);
  });
});
