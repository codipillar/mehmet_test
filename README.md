# Server-Authoritative Build Timer for Mehmet Alp Ehliz Steppe Studio

A production-ready NestJS implementation of a server-authoritative build timer designed for MMORTS games. Features database persistence, atomic transactions, automatic scheduler-based completion, and crash recovery.

## 🎯 Key Features

- ✅ **Database Persistence**: SQLite/PostgreSQL-backed storage for crash recovery
- ✅ **Atomic Transactions**: Resource deduction + build creation in a single transaction
- ✅ **Server-Driven Completion**: Scheduler automatically completes builds based on `executeAt` timestamps
- ✅ **Crash Recovery**: On server restart, automatically completes builds that finished during downtime
- ✅ **No Client-Driven Completion**: Builds complete automatically - no `/stop` endpoint
- ✅ **NestJS Architecture**: Modular, testable, production-ready structure
- ✅ **TypeORM Integration**: Database entities with proper indexing

## 🏗️ Architecture

```
src/
├── entities/
│   ├── build.entity.ts           # Build persistence model
│   └── user-resources.entity.ts  # User resources for atomic deduction
├── database/
│   └── database.module.ts        # TypeORM configuration
├── build-timer/
│   ├── build-timer.service.ts    # Core business logic with transactions
│   ├── build-timer.controller.ts # REST API endpoints
│   ├── build-timer.module.ts     # NestJS module
│   └── dto/
│       └── start-build.dto.ts    # Request validation
├── scheduler/
│   ├── scheduler.service.ts      # Worker that auto-completes builds
│   └── scheduler.module.ts        # Scheduler module
├── app.module.ts                  # Root module
└── main.ts                        # Application entry point
```

## 🔑 Design Decisions

### 1. **Database Persistence**
- All builds stored in database (SQLite for demo, easily switchable to PostgreSQL)
- Indexed on `executeAt` and `status` for efficient scheduler queries
- Survives server crashes and restarts

### 2. **Atomic Transactions**
```typescript
// Resource deduction + build creation happens atomically
// Prevents race conditions and double-spends
await queryRunner.startTransaction();
// ... deduct resources ...
// ... create build ...
await queryRunner.commitTransaction();
```

### 3. **Server-Calculated `executeAt`**
- Server calculates completion time: `executeAt = startTime + duration`
- Client cannot manipulate this - it's server-authoritative
- Scheduler polls for builds where `executeAt <= now`

### 4. **No Client Stop Endpoint**
- Builds complete automatically via scheduler
- Client can only query status, never trigger completion
- Prevents client-side manipulation

### 5. **Crash Recovery**
```typescript
// On server startup, recover builds that completed during downtime
async onModuleInit() {
  const recovered = await this.buildTimerService.recoverCompletedBuilds();
}
```

## 📦 Installation

```bash
npm install
```

## 🚀 Usage

### Development Mode

```bash
npm run start:dev
```

### Production Build

```bash
npm run build
npm run start:prod
```

### Running Tests

```bash
npm test
```

## 🔌 API Endpoints

### Start a Build (with Atomic Resource Deduction)

```bash
POST /api/builds/start
Content-Type: application/json

{
  "userId": "user-123",
  "buildType": "barracks",
  "duration": 60000,        # 1 minute in milliseconds
  "woodCost": 100,
  "clayCost": 50,
  "ironCost": 25,
  "cropCost": 10
}
```

**Response:**
```json
{
  "id": "uuid-here",
  "userId": "user-123",
  "buildType": "barracks",
  "startTime": "2024-01-15T10:00:00.000Z",
  "executeAt": "2024-01-15T10:01:00.000Z",
  "endTime": null,
  "duration": null,
  "status": "running",
  "isValid": true,
  "woodCost": 100,
  "clayCost": 50,
  "ironCost": 25,
  "cropCost": 10
}
```

**Key Points:**
- Resources are deducted atomically (transaction)
- `executeAt` is server-calculated
- Build will auto-complete when `executeAt` is reached

### Get Build Status

```bash
GET /api/builds/:buildId
```

**Response:**
```json
{
  "id": "uuid-here",
  "userId": "user-123",
  "buildType": "barracks",
  "startTime": "2024-01-15T10:00:00.000Z",
  "executeAt": "2024-01-15T10:01:00.000Z",
  "endTime": "2024-01-15T10:01:00.123Z",
  "duration": 60123,
  "status": "completed",
  "isValid": true
}
```

### Get User's Builds

```bash
GET /api/builds/user/:userId
```

### Health Check

```bash
GET /health
```

## ⚙️ How It Works

### 1. Starting a Build

```typescript
// Client requests build start
POST /api/builds/start { userId, buildType, duration, costs }

// Server:
// 1. Starts database transaction
// 2. Locks user resources row (pessimistic lock)
// 3. Validates sufficient resources
// 4. Deducts resources atomically
// 5. Creates build with server-calculated executeAt
// 6. Commits transaction
```

### 2. Automatic Completion

```typescript
// Scheduler runs every 5 seconds
@Cron(CronExpression.EVERY_5_SECONDS)
async processCompletedBuilds() {
  // Query: WHERE status = 'running' AND executeAt <= NOW()
  const builds = await this.getBuildsToComplete();
  
  // Auto-complete each build
  for (const build of builds) {
    await this.completeBuild(build.id);
  }
}
```

### 3. Crash Recovery

```typescript
// On server startup
async onModuleInit() {
  // Find all builds that should have completed during downtime
  const recovered = await this.recoverCompletedBuilds();
  // Logs: "Recovered 5 builds from crash/downtime"
}
```

## 🔒 Security & Data Integrity

1. **Atomic Transactions**: Resource deduction and build creation are atomic
2. **Pessimistic Locking**: User resources row is locked during transaction
3. **Server-Calculated Timestamps**: `executeAt` is never client-provided
4. **No Client Completion**: Clients cannot trigger build completion
5. **Database Constraints**: TypeORM enforces data integrity

## 🧪 Testing

The project includes comprehensive tests demonstrating:
- Atomic transaction behavior
- Resource validation
- Scheduler functionality
- Crash recovery scenarios

Run tests:
```bash
npm test
```

## 🔄 Database Migration

For production, use migrations instead of `synchronize: true`:

```bash
npm run migration:generate -- -n InitialSchema
npm run migration:run
```

## 📝 Production Considerations

1. **Database**: Switch from SQLite to PostgreSQL for production
2. **Migrations**: Disable `synchronize: true`, use migrations
3. **Scheduler Frequency**: Adjust cron schedule based on build durations
4. **Connection Pooling**: Configure TypeORM connection pool
5. **Monitoring**: Add logging/monitoring for scheduler and transactions

## 🎓 Key Learnings

This implementation demonstrates:
- **MMORTS Architecture**: Server-authoritative, database-backed, scheduler-driven
- **NestJS Patterns**: Modules, services, dependency injection
- **Transaction Management**: Atomic operations for game state
- **Crash Recovery**: Handling server restarts gracefully
- **Production Readiness**: Proper structure for scaling

## License

Luca
