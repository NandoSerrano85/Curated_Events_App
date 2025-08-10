# Contributing to Events Platform

Thank you for your interest in contributing to Events Platform! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Architecture Guidelines](#architecture-guidelines)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)

## 📜 Code of Conduct

This project adheres to the Contributor Covenant Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to conduct@events-platform.com.

### Our Pledge

- Be welcoming to newcomers
- Be respectful of differing viewpoints and experiences
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Docker**: 20.0+ and Docker Compose 2.0+
- **Go**: 1.21+ (for Go service development)
- **Python**: 3.11+ (for Python service development)
- **Git**: Latest version
- **Make**: For using Makefiles
- **Your favorite IDE**: VS Code, GoLand, PyCharm, etc.

### Fork and Clone

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/events-platform.git
   cd events-platform
   ```
3. **Add** the upstream remote:
   ```bash
   git remote add upstream https://github.com/events-platform/events-platform.git
   ```

### Development Environment Setup

1. **Set up the development environment**:
   ```bash
   cd deployments/compose
   make setup
   make dev
   ```

2. **Verify everything works**:
   ```bash
   make health
   ```

3. **Access development tools**:
   ```bash
   make dev-urls
   ```

## 🔄 Development Workflow

### Branch Strategy

We use **GitHub Flow** with feature branches:

1. **Main Branch**: `main` - Production-ready code
2. **Feature Branches**: `feature/description` - New features
3. **Bug Fix Branches**: `fix/description` - Bug fixes
4. **Hot Fix Branches**: `hotfix/description` - Critical production fixes

### Workflow Steps

1. **Sync with upstream**:
   ```bash
   git checkout main
   git pull upstream main
   git push origin main
   ```

2. **Create feature branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make changes and commit**:
   ```bash
   # Make your changes
   git add .
   git commit -m "feat: add amazing feature"
   ```

4. **Push and create PR**:
   ```bash
   git push origin feature/amazing-feature
   # Create Pull Request on GitHub
   ```

5. **Keep branch updated**:
   ```bash
   git checkout main
   git pull upstream main
   git checkout feature/amazing-feature
   git rebase main
   ```

## 📏 Coding Standards

### Go Services

#### **Code Style**
- Follow standard Go conventions
- Use `gofmt` for formatting
- Use `golangci-lint` for linting
- Follow effective Go practices

#### **Naming Conventions**
- Use `camelCase` for variables and functions
- Use `PascalCase` for exported functions and types
- Use descriptive names for packages
- Avoid abbreviations unless widely understood

#### **Error Handling**
```go
// Good
result, err := doSomething()
if err != nil {
    return fmt.Errorf("failed to do something: %w", err)
}

// Bad
result, _ := doSomething() // Ignoring errors
```

#### **Testing**
- Write table-driven tests
- Use meaningful test names
- Test both success and error cases
- Aim for >80% coverage

```go
func TestUserService_CreateUser(t *testing.T) {
    tests := []struct {
        name    string
        input   CreateUserRequest
        want    *User
        wantErr bool
    }{
        {
            name: "valid user creation",
            input: CreateUserRequest{
                Email: "test@example.com",
                Name:  "Test User",
            },
            want: &User{
                Email: "test@example.com",
                Name:  "Test User",
            },
            wantErr: false,
        },
        // More test cases...
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := service.CreateUser(tt.input)
            if (err != nil) != tt.wantErr {
                t.Errorf("CreateUser() error = %v, wantErr %v", err, tt.wantErr)
                return
            }
            if !reflect.DeepEqual(got, tt.want) {
                t.Errorf("CreateUser() = %v, want %v", got, tt.want)
            }
        })
    }
}
```

### Python Services

#### **Code Style**
- Follow PEP 8 style guide
- Use `black` for code formatting
- Use `flake8` for linting
- Use `mypy` for type checking

#### **Type Hints**
Always use type hints for function parameters and return values:

```python
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class EventRequest(BaseModel):
    title: str
    description: str
    date: datetime
    location: str
    capacity: int

async def create_event(request: EventRequest) -> Dict[str, Any]:
    """Create a new event."""
    # Implementation
    return {"id": event_id, "status": "created"}
```

#### **Async/Await**
Use async/await for I/O operations:

```python
# Good
async def get_user_events(user_id: int) -> List[Event]:
    async with database.transaction():
        events = await Event.select().where(Event.user_id == user_id)
        return events

# Bad - blocking operation
def get_user_events(user_id: int) -> List[Event]:
    events = Event.select().where(Event.user_id == user_id)
    return list(events)
```

#### **Error Handling**
```python
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

async def get_event(event_id: int) -> Event:
    try:
        event = await Event.get(Event.id == event_id)
        return event
    except Event.DoesNotExist:
        logger.warning(f"Event {event_id} not found")
        raise HTTPException(status_code=404, detail="Event not found")
    except Exception as e:
        logger.error(f"Failed to get event {event_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
```

### Database

#### **Migrations**
- Always create migrations for schema changes
- Write both up and down migrations
- Test migrations on sample data
- Document breaking changes

#### **Queries**
- Use prepared statements
- Optimize for performance
- Add proper indexes
- Avoid N+1 queries

### API Design

#### **RESTful Conventions**
- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Use meaningful resource names
- Follow consistent URL patterns
- Return appropriate status codes

#### **Request/Response Format**
```json
// Request
{
  "title": "Event Title",
  "description": "Event description",
  "date": "2024-12-01T18:00:00Z"
}

// Success Response
{
  "success": true,
  "data": {
    "id": 123,
    "title": "Event Title",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "message": "Event created successfully"
}

// Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  }
}
```

## 🔀 Pull Request Process

### Before Submitting

1. **Run tests**:
   ```bash
   make test
   make test-integration
   ```

2. **Check code quality**:
   ```bash
   make lint
   make format
   ```

3. **Update documentation**:
   - Update API documentation for endpoint changes
   - Update README for new features
   - Add inline code comments

### PR Guidelines

#### **Title Format**
Use conventional commit format:
- `feat: add user profile management`
- `fix: resolve database connection timeout`
- `docs: update API documentation`
- `refactor: optimize event search algorithm`

#### **Description Template**
```markdown
## What
Brief description of what this PR does.

## Why  
Explanation of why this change is needed.

## How
Technical details of how the change was implemented.

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Load testing (if applicable)

## Documentation
- [ ] API documentation updated
- [ ] README updated (if needed)
- [ ] Inline comments added

## Screenshots (if applicable)
Include screenshots for UI changes.

## Breaking Changes
List any breaking changes and migration steps.

Closes #123
```

### Review Process

1. **Automated Checks**: All CI checks must pass
2. **Code Review**: At least one maintainer review required
3. **Testing**: All tests must pass
4. **Documentation**: Documentation must be updated

## 🐛 Issue Guidelines

### Bug Reports

Use the bug report template:

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Environment**
- OS: [e.g. iOS]
- Browser [e.g. chrome, safari]
- Version [e.g. 22]

**Additional context**
Any other context about the problem.
```

### Feature Requests

```markdown
**Is your feature request related to a problem?**
A clear description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Any alternative solutions or features considered.

**Additional context**
Any other context or screenshots.
```

## 🏗️ Architecture Guidelines

### Service Design Principles

1. **Single Responsibility**: Each service has one clear responsibility
2. **Loose Coupling**: Services communicate through well-defined APIs
3. **High Cohesion**: Related functionality stays together
4. **Stateless**: Services don't maintain client state
5. **Idempotent**: Operations can be safely repeated

### Communication Patterns

#### **Synchronous Communication (HTTP)**
- Direct service-to-service calls
- Request/response pattern
- Used for immediate responses

#### **Asynchronous Communication (Messaging)**
- Event-driven architecture
- Publish/subscribe pattern
- Used for decoupling and scalability

### Data Management

#### **Database Per Service**
Each service owns its data and database schema.

#### **Event Sourcing**
For audit trails and event replay capabilities.

#### **CQRS (Command Query Responsibility Segregation)**
Separate read and write operations for complex domains.

## 🧪 Testing Guidelines

### Test Pyramid

1. **Unit Tests (70%)**
   - Fast, isolated, focused
   - Test individual functions/methods
   - Mock external dependencies

2. **Integration Tests (20%)**
   - Test service interactions
   - Test database operations
   - Test message queue operations

3. **End-to-End Tests (10%)**
   - Test complete user workflows
   - Test across service boundaries
   - Test critical business paths

### Test Organization

```
tests/
├── unit/           # Unit tests
│   ├── go/        # Go service unit tests
│   └── python/    # Python service unit tests
├── integration/   # Integration tests
│   ├── api/       # API integration tests
│   └── db/        # Database integration tests
└── e2e/           # End-to-end tests
    ├── user/      # User workflow tests
    └── event/     # Event workflow tests
```

### Test Data Management

- Use factories for test data creation
- Clean up test data after each test
- Use separate test databases
- Seed minimal required data

## 📚 Documentation

### Code Documentation

#### **Go Documentation**
```go
// UserService handles user-related operations.
type UserService struct {
    db *database.DB
}

// CreateUser creates a new user account.
// It validates the input, checks for duplicate emails,
// and returns the created user with generated ID.
func (s *UserService) CreateUser(req CreateUserRequest) (*User, error) {
    // Implementation
}
```

#### **Python Documentation**
```python
class UserService:
    """Handles user-related operations.
    
    This service manages user lifecycle including creation,
    authentication, and profile management.
    """
    
    async def create_user(self, request: CreateUserRequest) -> User:
        """Create a new user account.
        
        Args:
            request: User creation request containing email, name, etc.
            
        Returns:
            Created user with generated ID and timestamps.
            
        Raises:
            ValidationError: If input data is invalid.
            DuplicateError: If email already exists.
        """
        # Implementation
```

### API Documentation

- Use OpenAPI/Swagger specifications
- Include request/response examples
- Document error codes and messages
- Provide code samples in multiple languages

### Architecture Documentation

- Keep architecture decision records (ADRs)
- Document system design decisions
- Maintain up-to-date diagrams
- Explain trade-offs and alternatives

## 🎯 Best Practices

### Performance

- **Caching**: Cache frequently accessed data
- **Database Optimization**: Use proper indexes and query optimization
- **Async Operations**: Use async/await for I/O operations
- **Connection Pooling**: Reuse database connections

### Security

- **Input Validation**: Validate all input data
- **Authentication**: Verify user identity
- **Authorization**: Check user permissions
- **Audit Logging**: Log security-relevant events

### Observability

- **Logging**: Use structured logging with correlation IDs
- **Metrics**: Emit business and technical metrics
- **Tracing**: Add distributed tracing for complex operations
- **Health Checks**: Implement comprehensive health checks

### Error Handling

- **Fail Fast**: Detect and report errors early
- **Graceful Degradation**: Handle partial failures gracefully
- **Circuit Breakers**: Prevent cascade failures
- **Retry Logic**: Implement exponential backoff

## 🤔 Questions?

If you have questions about contributing:

1. **Check existing issues and discussions**
2. **Join our Discord community**
3. **Reach out to maintainers**
4. **Create a discussion on GitHub**

Thank you for contributing to Events Platform! 🎉