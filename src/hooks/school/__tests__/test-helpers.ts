import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { vi } from 'vitest';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => Promise.resolve({ data: null, error: null })),
      delete: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  })),
}));

// Mock AuthContext
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    role: null,
    institutionId: null,
    isLoading: false,
  })),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

// Test Query Client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

// Test Wrapper
export const TestQueryClientWrapper = ({ children }: { children: ReactNode }) =>
  React.createElement(QueryClientProvider, {
    client: createTestQueryClient()
  }, children);

// Mock helpers
export const mockAuthUser = async (user: { id: string; role: string; institutionId?: string }) => {
  const mod = await import('../../../contexts/AuthContext');
  const mockUseAuth = vi.mocked(mod.useAuth);
  mockUseAuth.mockReturnValue({
    effectiveInstitutionId: user.institutionId || 'institution-123',
    isProviderOwner: false,
    loading: false,
    refreshSupportContext: vi.fn(),
    session: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    supportContext: null,
    teacherId: null,
    user: { id: user.id } as never,
    userRole: user.role as never,
  });
};

export const mockSupabaseGradeRecords = async (records: unknown[]) => {
  const mod = await import('@supabase/supabase-js');
  const mockCreateClient = vi.mocked(mod.createClient);
  const mockClient = mockCreateClient('', '');

  vi.mocked(mockClient.from).mockReturnValue({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: records, error: null })),
        })),
      })),
    })),
    insert: vi.fn(() => Promise.resolve({ data: records, error: null })),
    update: vi.fn(() => Promise.resolve({ data: records, error: null })),
    delete: vi.fn(() => Promise.resolve({ data: records, error: null })),
  } as unknown as ReturnType<typeof mockClient.from>);

  return mockClient;
};
