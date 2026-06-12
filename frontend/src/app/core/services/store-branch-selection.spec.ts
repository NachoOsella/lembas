import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { StoreBranchSelectionService } from './store-branch-selection';

/** Unit tests for public store pickup branch selection state. */
describe('StoreBranchSelectionService', () => {
  let service: StoreBranchSelectionService;
  let storage: Record<string, string>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => storage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete storage[key];
      }),
      clear: vi.fn(() => {
        storage = {};
      }),
    });

    TestBed.configureTestingModule({
      providers: [StoreBranchSelectionService, provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    httpMock?.verify();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('should load public store branches', () => {
    setupService();

    service.loadBranches().subscribe((branches) => {
      expect(branches).toHaveLength(2);
    });

    const req = httpMock.expectOne('/api/store/branches');
    expect(req.request.method).toBe('GET');
    req.flush([
      { id: 1, name: 'Centro' },
      { id: 2, name: 'Nueva Cordoba' },
    ]);

    expect(service.branches()).toHaveLength(2);
    expect(service.selectedBranchId()).toBeNull();
    expect(service.needsSelection()).toBe(true);
  });

  it('should auto-select the only branch returned by the backend', () => {
    setupService();

    service.loadBranches().subscribe();

    httpMock.expectOne('/api/store/branches').flush([{ id: 7, name: 'Centro' }]);

    expect(service.selectedBranchId()).toBe(7);
    expect(service.selectedBranch()?.name).toBe('Centro');
    expect(localStorage.getItem('lembas.store.selectedBranchId')).toBe('7');
    expect(service.needsSelection()).toBe(false);
  });

  it('should keep a valid persisted branch selection', () => {
    localStorage.setItem('lembas.store.selectedBranchId', '2');
    setupService();

    service.loadBranches().subscribe();

    httpMock.expectOne('/api/store/branches').flush([
      { id: 1, name: 'Centro' },
      { id: 2, name: 'Nueva Cordoba' },
    ]);

    expect(service.selectedBranchId()).toBe(2);
    expect(service.selectedBranch()?.name).toBe('Nueva Cordoba');
  });

  it('should clear an invalid persisted branch selection', () => {
    localStorage.setItem('lembas.store.selectedBranchId', '99');
    setupService();

    service.loadBranches().subscribe();

    httpMock.expectOne('/api/store/branches').flush([
      { id: 1, name: 'Centro' },
      { id: 2, name: 'Nueva Cordoba' },
    ]);

    expect(service.selectedBranchId()).toBeNull();
    expect(localStorage.getItem('lembas.store.selectedBranchId')).toBeNull();
  });

  it('should persist explicit user selection', () => {
    setupService();

    service.branches.set([
      { id: 1, name: 'Centro' },
      { id: 2, name: 'Nueva Cordoba' },
    ]);

    service.selectBranch(2);

    expect(service.selectedBranchId()).toBe(2);
    expect(localStorage.getItem('lembas.store.selectedBranchId')).toBe('2');
  });

  function setupService(): void {
    service = TestBed.inject(StoreBranchSelectionService);
    httpMock = TestBed.inject(HttpTestingController);
  }
});
