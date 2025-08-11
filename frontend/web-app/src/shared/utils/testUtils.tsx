import React, { ReactElement } from 'react';
import { render, RenderOptions, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Mock data generators
export const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  role: 'user' as const,
  permissions: ['events:read', 'events:create'],
  profile: {
    avatar: 'https://example.com/avatar.jpg',
    bio: 'Test user bio',
    location: 'Test City',
    interests: ['technology', 'music'],
    preferences: {
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
      privacy: {
        profileVisible: true,
        eventsVisible: true,
      },
    },
  },
};

export const mockEvent = {
  id: 1,
  title: 'Test Event',
  description: 'This is a test event',
  date: '2024-12-25T18:00:00Z',
  location: 'Test Venue, Test City',
  capacity: 100,
  currentRegistrations: 25,
  category: 'technology' as const,
  tags: ['react', 'javascript', 'frontend'],
  price: 50,
  currency: 'USD',
  createdBy: 1,
  creator: mockUser,
  imageUrl: 'https://example.com/event.jpg',
  status: 'published' as const,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const mockAuthTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresIn: 3600,
};

// Test wrapper component
interface TestWrapperProps {
  children: React.ReactNode;
  initialAuthState?: {
    user: any;
    tokens: any;
    isAuthenticated: boolean;
  };
  queryClient?: QueryClient;
}

export const TestWrapper: React.FC<TestWrapperProps> = ({
  children,
  initialAuthState,
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
        cacheTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  }),
}) => {
  // Mock auth store if needed
  if (initialAuthState) {
    // This would require mocking the auth store
    // Implementation depends on your specific auth setup
  }

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialAuthState?: TestWrapperProps['initialAuthState'];
  queryClient?: QueryClient;
  route?: string;
}

export const renderWithProviders = (
  ui: ReactElement,
  {
    initialAuthState,
    queryClient,
    route = '/',
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  // Set up the initial route if provided
  if (route !== '/') {
    window.history.pushState({}, 'Test page', route);
  }

  return {
    user: userEvent.setup(),
    ...render(ui, {
      wrapper: ({ children }) => (
        <TestWrapper
          initialAuthState={initialAuthState}
          queryClient={queryClient}
        >
          {children}
        </TestWrapper>
      ),
      ...renderOptions,
    }),
  };
};

// Custom queries and utilities
export const queries = {
  // Common element queries
  getByTestId: (testId: string) => screen.getByTestId(testId),
  queryByTestId: (testId: string) => screen.queryByTestId(testId),
  findByTestId: (testId: string) => screen.findByTestId(testId),

  // Form element queries
  getFormField: (label: string | RegExp) => screen.getByLabelText(label),
  getButton: (name: string | RegExp) => screen.getByRole('button', { name }),
  getLink: (name: string | RegExp) => screen.getByRole('link', { name }),
  getHeading: (name: string | RegExp) => screen.getByRole('heading', { name }),

  // Custom component queries
  getEventCard: (eventTitle: string) => 
    screen.getByRole('heading', { name: eventTitle }).closest('[data-testid*="event-"]'),
  getNotification: (message: string) =>
    screen.getByText(message).closest('[role="alert"]'),
};

// Mock implementations
export const mocks = {
  // API mocks
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },

  // WebSocket mock
  webSocket: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },

  // Storage mocks
  localStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },

  // Geolocation mock
  geolocation: {
    getCurrentPosition: vi.fn(),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  },

  // Intersection Observer mock
  intersectionObserver: {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  },
};

// Test helpers
export const helpers = {
  // Wait for element to appear
  waitForElement: async (testId: string) => {
    return await screen.findByTestId(testId);
  },

  // Wait for loading to finish
  waitForLoadingToFinish: async () => {
    await screen.findByText(/loading/i, {}, { timeout: 100 }).catch(() => {});
    // Wait a bit more to ensure loading is done
    await new Promise(resolve => setTimeout(resolve, 50));
  },

  // Fill form helper
  fillForm: async (formData: Record<string, string>, user = userEvent.setup()) => {
    for (const [field, value] of Object.entries(formData)) {
      const input = queries.getFormField(new RegExp(field, 'i'));
      await user.clear(input);
      await user.type(input, value);
    }
  },

  // Submit form helper
  submitForm: async (formTestId: string, user = userEvent.setup()) => {
    const form = queries.getByTestId(formTestId);
    const submitButton = form.querySelector('button[type="submit"]') || 
                        form.querySelector('[data-testid*="submit"]');
    if (submitButton) {
      await user.click(submitButton);
    }
  },

  // Assert loading state
  assertLoading: () => {
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  },

  // Assert error message
  assertError: (message: string) => {
    expect(screen.getByText(message)).toBeInTheDocument();
  },

  // Assert success message
  assertSuccess: (message: string) => {
    expect(screen.getByText(message)).toBeInTheDocument();
  },
};

// Setup and teardown utilities
export const setup = {
  // Mock fetch globally
  mockFetch: () => {
    global.fetch = vi.fn();
  },

  // Mock window.matchMedia
  mockMatchMedia: () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  },

  // Mock IntersectionObserver
  mockIntersectionObserver: () => {
    global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
      ...mocks.intersectionObserver,
      callback,
    }));
  },

  // Mock ResizeObserver
  mockResizeObserver: () => {
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  },

  // Setup all common mocks
  all: () => {
    setup.mockFetch();
    setup.mockMatchMedia();
    setup.mockIntersectionObserver();
    setup.mockResizeObserver();
  },
};

// Export everything for easy access
export * from '@testing-library/react';
export { userEvent };
export { vi as jest }; // For compatibility with Jest syntax