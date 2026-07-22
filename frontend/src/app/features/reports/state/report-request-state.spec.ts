import { Observable, Subject, of, throwError } from 'rxjs';

import { ReportRequestState } from './report-request-state';

describe('ReportRequestState', () => {
  it('exposes loading, data, and empty completion states', () => {
    const state = new ReportRequestState<string | null>();

    expect(state.loading()).toBe(false);
    state.load(() => of(null), 'No se pudo cargar el reporte.');

    expect(state.loading()).toBe(false);
    expect(state.data()).toBeNull();
    expect(state.errorMessage()).toBeNull();
  });

  it('lets the newest request win over an older response', () => {
    const state = new ReportRequestState<string>();
    const first = new Subject<string>();
    const second = new Subject<string>();

    state.load(() => first, 'No se pudo cargar el primer reporte.');
    expect(state.loading()).toBe(true);
    state.load(() => second, 'No se pudo cargar el segundo reporte.');

    first.next('stale');
    expect(state.data()).toBeNull();
    expect(state.loading()).toBe(true);

    second.next('latest');
    expect(state.data()).toBe('latest');
    expect(state.loading()).toBe(false);
  });

  it('maps failures to controlled UI copy and retries the last request', () => {
    const state = new ReportRequestState<string>();
    let calls = 0;

    state.load(() => {
      calls += 1;
      return calls === 1 ? throwError(() => new Error('backend details')) : of('recovered');
    }, 'No se pudo cargar el reporte.');

    expect(state.loading()).toBe(false);
    expect(state.errorMessage()).toBe('No se pudo cargar el reporte.');
    expect(state.data()).toBeNull();

    state.retry();
    expect(calls).toBe(2);
    expect(state.data()).toBe('recovered');
    expect(state.errorMessage()).toBeNull();
  });

  it('ignores late emissions after destruction and rejects future loads', () => {
    const state = new ReportRequestState<string>();
    const response = new Subject<string>();

    state.load(() => response, 'No se pudo cargar el reporte.');
    state.destroy();
    response.next('late');
    state.load(() => of('after destroy'), 'No se pudo cargar el reporte.');

    expect(state.loading()).toBe(false);
    expect(state.data()).toBeNull();
    expect(state.errorMessage()).toBeNull();
  });

  it('supports an observable that cannot cancel its producer', () => {
    const state = new ReportRequestState<string>();
    const first = new Subject<string>();
    const uncancellable = new Observable<string>((subscriber) => {
      first.subscribe((value) => subscriber.next(value));
      return () => undefined;
    });
    const latest = new Subject<string>();

    state.load(() => uncancellable, 'No se pudo cargar el primer reporte.');
    state.load(() => latest, 'No se pudo cargar el segundo reporte.');
    first.next('stale');
    latest.next('latest');

    expect(state.data()).toBe('latest');
  });
});
