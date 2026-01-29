# Server-Authoritative Build Timer for Mehmet Alp Ehliz Steppe Studio

A Node.js/TypeScript implementation of a server-authoritative build timer that calculates and validates build start/end times server-side, preventing client-side manipulation.

## Features

- ✅ **Server-Authoritative Timing**: All timestamps are generated and validated on the server
- ✅ **Duration Validation**: Configurable min/max duration constraints
- ✅ **Client Time Validation**: Security check to detect client-side timestamp manipulation
- ✅ **TypeScript**: Fully typed for better code quality and IDE support
- ✅ **RESTful API**: Express.js server with clean API endpoints
- ✅ **Comprehensive Tests**: Jest test suite demonstrating testing practices

## Architecture

The project follows a clean architecture pattern:

```
src/
├── BuildTimer.ts      # Core timer class with business logic
├── server.ts          # Express API server
├── index.ts           # Public exports
└── BuildTimer.test.ts # Unit tests
```

### Core Components

**BuildTimer Class**: The main class that manages build timing with:
- Start/stop functionality
- Server-side timestamp generation
- Duration validation
- Client time validation (security)

**Express Server**: RESTful API demonstrating:
- Clean route handlers
- Error handling
- Request validation
- JSON responses

## Installation

```bash
npm install
```

## Usage

### Development Mode

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

### Running Tests

```bash
npm test
```

## API Endpoints

### Start a Build

```bash
POST /api/builds/start
Content-Type: application/json

{
  "buildId": "build-123"
}
```

**Response:**
```json
{
  "buildId": "build-123",
  "startTime": "2024-01-15T10:00:00.000Z",
  "endTime": null,
  "duration": null,
  "status": "running",
  "isValid": true
}
```

### Stop a Build

```bash
POST /api/builds/:buildId/stop
Content-Type: application/json

{
  "status": "completed"  // or "failed"
}
```

**Response:**
```json
{
  "buildId": "build-123",
  "startTime": "2024-01-15T10:00:00.000Z",
  "endTime": "2024-01-15T10:05:30.000Z",
  "duration": 330000,
  "status": "completed",
  "isValid": true
}
```

### Get Build Status

```bash
GET /api/builds/:buildId
```

### Get All Builds

```bash
GET /api/builds
```

### Validate Client End Time

```bash
POST /api/builds/:buildId/validate
Content-Type: application/json

{
  "clientEndTime": "2024-01-15T10:05:30.000Z",
  "toleranceMs": 5000
}
```

**Response:**
```json
{
  "isValid": true,
  "message": "Client time matches server expectations"
}
```

## Programmatic Usage

```typescript
import { BuildTimer } from './src/BuildTimer';

const timer = new BuildTimer({
  maxDuration: 3600000, // 1 hour max
  minDuration: 100,      // 100ms minimum
});

// Start a build
const build = timer.startBuild('my-build-id');

// ... do work ...

// Stop the build
const result = timer.stopBuild('my-build-id', 'completed');

console.log(`Build took ${result.duration}ms`);
console.log(`Valid: ${result.isValid}`);
```

## Security Features

1. **Server-Side Timestamps**: All timestamps are generated on the server, preventing client manipulation
2. **Duration Validation**: Enforces min/max duration constraints
3. **Client Time Validation**: `validateClientEndTime()` method detects if a client-provided timestamp differs from the server's recorded time

## Testing

The project includes comprehensive unit tests demonstrating:
- Test-driven development practices
- Edge case handling
- Error scenarios
- Async operations

Run tests with:
```bash
npm test
```

## License

Luca
