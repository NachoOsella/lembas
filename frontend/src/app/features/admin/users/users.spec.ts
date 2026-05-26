import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { MessageService } from 'primeng/api';

import { Users } from './users';
import { UserService } from '../../../core/services/user';
import { Branch, Page, UserResponse } from '../../../shared/models/user';

/** Sample branches for testing. */
const SAMPLE_BRANCHES: Branch[] = [
  { id: 1, name: 'Centro' },
  { id: 2, name: 'Nueva Cordoba' },
];

function buildUser(overrides: Partial<UserResponse> = {}): UserResponse {
  return {
    id: 1,
    email: 'admin@lembas.com',
    firstName: 'Admin',
    lastName: 'User',
    phone: null,
    role: 'ADMIN',
    branchId: null,
    enabled: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function userPage(users: UserResponse[]): Page<UserResponse> {
  return {
    content: users,
    totalElements: users.length,
    totalPages: 1,
    number: 0,
    size: 20,
    first: true,
    last: true,
    empty: users.length === 0,
  };
}

/** Type-unsafe helper to access protected component members. */
function unsafe(component: Users): Record<string, unknown> {
  return component as unknown as Record<string, unknown>;
}

describe('Users', () => {
  let component: Users;
  let fixture: ComponentFixture<Users>;
  let svc: Record<string, ReturnType<typeof vi.fn>>;

  function configure(): void {
    svc = {
      listUsers: vi.fn().mockReturnValue(of(userPage([]))),
      createUser: vi.fn().mockReturnValue(of(buildUser())),
      updateUser: vi.fn().mockReturnValue(of(buildUser())),
      updateUserStatus: vi.fn().mockReturnValue(of(buildUser())),
      listBranches: vi.fn().mockReturnValue(of(SAMPLE_BRANCHES)),
    };

    TestBed.configureTestingModule({
      imports: [Users],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        { provide: UserService, useValue: svc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Users);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  // ---------------------------------------------------------------------------
  // Composition
  // ---------------------------------------------------------------------------
  describe('composition', () => {
    it('should create the orchestrator component', () => {
      configure();
      expect(component).toBeTruthy();
    });

    it('should load branches on construction', () => {
      configure();
      expect(svc['listBranches']).toHaveBeenCalled();
    });

    it('should provide a branchNameFn that maps IDs to names', () => {
      configure();
      const c = unsafe(component);

      const fn = c['branchNameFn'] as (id: number | null) => string | undefined;
      expect(fn(1)).toBe('Centro');
      expect(fn(2)).toBe('Nueva Cordoba');
      expect(fn(null)).toBeUndefined();
      expect(fn(99)).toBeUndefined();
    });

    it('should render app-user-list and app-user-form in template', () => {
      configure();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('app-user-list')).toBeTruthy();
      expect(el.querySelector('app-user-form')).toBeTruthy();
    });

    it('should render toast container', () => {
      configure();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('app-toast')).toBeTruthy();
    });
  });
});
