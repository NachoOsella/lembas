/**
 * A single section of the public terms and conditions document.
 *
 * Each section is rendered as a heading followed by paragraphs and,
 * optionally, a bulleted list. The backend keeps the document as plain
 * text so the frontend does not need to parse Markdown.
 */
export interface TermsSection {
  /** Section heading (e.g. "1. Informacion general"). */
  title: string;
  /** Paragraphs shown one after the other. */
  paragraphs: string[];
  /** Optional bulleted list shown under the paragraphs. */
  bullets: string[];
}

/** Public payload returned by GET /api/store/terms. */
export interface TermsDocument {
  /** Document title shown at the top of the page. */
  title: string;
  /** ISO-8601 date when the document was last updated. */
  lastUpdated: string;
  /** Optional intro paragraph shown before the first section. */
  intro: string;
  /** Ordered list of sections. */
  sections: TermsSection[];
}

/** A single FAQ entry. */
export interface FaqItem {
  /** Stable identifier used by the frontend for tracking. */
  id: string;
  /** The question shown on the collapsed panel header. */
  question: string;
  /** The answer shown when the panel is expanded. */
  answer: string;
  /** Optional category label (e.g. "Pedidos", "Pagos"). */
  category: string;
}

/** Public payload returned by GET /api/store/faq. */
export interface FaqDocument {
  /** Document title shown above the accordion. */
  title: string;
  /** Optional intro line shown between the title and the first item. */
  intro: string;
  /** Ordered list of FAQ items. */
  items: FaqItem[];
}
