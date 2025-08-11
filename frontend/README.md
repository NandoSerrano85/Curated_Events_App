# Events Platform Frontend

This directory contains the complete frontend implementation for the Events Platform, following the technical architecture specification with a multi-platform approach.

## Architecture Overview

The frontend is built using a hybrid architecture that supports:

- **Web Application**: Next.js 14 with React 18+ and TypeScript
- **Mobile Applications**: React Native with Expo 49+ for iOS/Android
- **Admin Panel**: Vite with React and Ant Design for administrative tasks

## Project Structure

```
frontend/
├── web-app/                    # Next.js 14 web application
├── mobile-app/                 # React Native mobile app (Expo)
├── admin-panel/                # Vite admin panel
├── shared/                     # Shared components, hooks, and utilities
│   ├── components/             # Atomic design system components
│   │   ├── atoms/              # Basic UI elements (Button, Input, etc.)
│   │   ├── molecules/          # Component combinations (SearchBar, EventCard)
│   │   ├── organisms/          # Complex components (EventsList, Forms)
│   │   └── templates/          # Page layouts
│   ├── hooks/                  # Reusable React hooks
│   ├── store/                  # Global state management (Zustand)
│   ├── api/                    # API integration layer
│   ├── types/                  # TypeScript type definitions
│   └── utils/                  # Utility functions and helpers
└── README.md                   # This file
```

## Technology Stack

### Core Technologies
- **React 18+**: Latest React features with concurrent rendering
- **TypeScript**: Type-safe development across all platforms
- **Zustand**: Lightweight global state management
- **TanStack Query**: Server state management with caching
- **Axios**: HTTP client with interceptors and error handling

### Web Application (Next.js 14)
- **Next.js 14**: App Router, Server Components, and optimizations
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Smooth animations and transitions
- **Headless UI**: Accessible component primitives

### Mobile Application (React Native + Expo)
- **Expo 49+**: Development platform and runtime
- **React Navigation**: Navigation library for mobile
- **NativeWind**: Tailwind CSS for React Native
- **React Native Screens**: Native navigation performance

### Admin Panel (Vite)
- **Vite**: Fast build tool and development server
- **Ant Design**: Enterprise-ready UI components
- **React Router**: Client-side routing

### Development & Testing
- **Vitest**: Fast unit testing framework
- **Testing Library**: Component testing utilities
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting

## Key Features

### 🎨 Atomic Design System
- Consistent components across all platforms
- Scalable and maintainable UI architecture
- Accessible components following WCAG guidelines
- Theme support with dark/light modes

### 🔄 Real-time Updates
- WebSocket integration for live event updates
- Real-time notifications and user activity
- Optimistic UI updates for better UX

### 📱 Progressive Web App (PWA)
- Offline support and caching strategies
- Service worker for background sync
- App-like experience on mobile web
- Push notifications support

### 🚀 Performance Optimizations
- Code splitting and lazy loading
- Image optimization and responsive images
- Virtual scrolling for large lists
- Bundle analysis and optimization

### 🔐 Security & Authentication
- JWT-based authentication with refresh tokens
- Protected routes and role-based access
- Secure API communication with HTTPS
- XSS and CSRF protection

### 🧪 Testing Strategy
- Unit tests for components and utilities
- Integration tests for user workflows
- End-to-end testing for critical paths
- Visual regression testing

## State Management

### Global State (Zustand)
- Authentication state and user session
- Application-wide UI state (theme, notifications)
- Navigation state and routing
- Global filters and search preferences

### Server State (TanStack Query)
- Event data with caching and invalidation
- User profiles and preferences
- Real-time data synchronization
- Background refetching and updates

### Local State (React)
- Component-specific state
- Form data and validation
- UI interactions and animations
- Temporary state that doesn't need persistence

## API Integration

### HTTP Client (Axios)
- Centralized API configuration
- Request/response interceptors
- Authentication token handling
- Error handling and retry logic

### WebSocket Client
- Real-time event updates
- User presence and activity
- Live notifications
- Connection management and reconnection

### Endpoint Management
- Typed API endpoints
- Request/response types
- Environment-specific configurations
- Rate limiting and caching

## Error Handling & Monitoring

### Error Boundaries
- Component-level error catching
- Graceful degradation
- Error reporting to monitoring services
- User-friendly error messages

### Performance Monitoring
- Core Web Vitals tracking
- Component render time monitoring
- API response time tracking
- User interaction analytics

### Logging & Analytics
- Structured logging for debugging
- User behavior analytics
- Error tracking and reporting
- Performance metrics collection

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Expo CLI for mobile development
- Backend services running (see backend README)

### Installation

1. **Install dependencies for all projects:**
```bash
# Web application
cd frontend/web-app
npm install

# Mobile application
cd ../mobile-app
npm install

# Admin panel
cd ../admin-panel
npm install
```

### Development

1. **Start the web application:**
```bash
cd frontend/web-app
npm run dev
```

2. **Start the mobile application:**
```bash
cd frontend/mobile-app
npm start
```

3. **Start the admin panel:**
```bash
cd frontend/admin-panel
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Building for Production

```bash
# Web application
cd frontend/web-app
npm run build

# Mobile application (requires Expo account)
cd ../mobile-app
expo build

# Admin panel
cd ../admin-panel
npm run build
```

## Environment Configuration

Create `.env` files in each project directory:

### Web Application (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_WS_URL=ws://localhost:8085
NEXT_PUBLIC_APP_ENV=development
```

### Mobile Application (.env)
```env
EXPO_PUBLIC_API_URL=http://localhost:8080/api
EXPO_PUBLIC_WS_URL=ws://localhost:8085
```

### Admin Panel (.env)
```env
REACT_APP_API_URL=http://localhost:8080/api
REACT_APP_WS_URL=ws://localhost:8085
```

## Deployment

### Web Application (Vercel/Netlify)
- Automatic deployments from Git
- Environment variables configuration
- Custom domains and SSL certificates
- CDN and performance optimization

### Mobile Application (Expo)
- Over-the-air (OTA) updates
- App store deployment via Expo
- TestFlight/Internal testing distribution
- Release channels for staging/production

### Admin Panel (Static Hosting)
- Build and deploy to static hosting
- Environment-specific builds
- Authentication and access control
- Monitoring and analytics setup

## Contributing

1. Follow the atomic design principles for component structure
2. Write comprehensive tests for new components
3. Use TypeScript for type safety
4. Follow the established coding standards
5. Test across all target platforms
6. Update documentation for new features

## Performance Guidelines

### Code Splitting
- Lazy load non-critical components
- Split vendor bundles appropriately
- Use dynamic imports for routes

### Image Optimization
- Use Next.js Image component for web
- Implement responsive images with srcSet
- Optimize images for mobile networks

### Bundle Optimization
- Analyze bundle sizes regularly
- Remove unused dependencies
- Use tree shaking effectively

### Runtime Performance
- Minimize re-renders with React.memo
- Use useCallback and useMemo appropriately
- Implement virtual scrolling for large lists

## Security Considerations

### Authentication
- Store tokens securely
- Implement proper session management
- Handle token refresh gracefully

### Data Validation
- Validate all user inputs
- Sanitize data before rendering
- Use TypeScript for compile-time checks

### Network Security
- Use HTTPS for all API calls
- Implement proper CORS policies
- Sanitize API responses

## Browser Support

### Web Application
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Mobile Application
- iOS 12+
- Android API 21+ (Android 5.0)

### Admin Panel
- Modern browsers with ES2020 support
- No Internet Explorer support

## Troubleshooting

### Common Issues
1. **Build failures**: Check Node.js version and dependencies
2. **API connection issues**: Verify backend is running and accessible
3. **WebSocket connection problems**: Check firewall and proxy settings
4. **Mobile app crashes**: Check Expo logs and device compatibility

### Debug Tools
- React Developer Tools for component debugging
- Network tab for API inspection
- Flipper for React Native debugging
- Lighthouse for performance auditing

## Resources

- [React Documentation](https://react.dev/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Expo Documentation](https://docs.expo.dev/)
- [TanStack Query Documentation](https://tanstack.com/query)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Ant Design Documentation](https://ant.design/docs/react/introduce)