import express, { Request, Response } from 'express';
import { BuildTimer, BuildTimerResult } from './BuildTimer';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Initialize the build timer with optional constraints
const buildTimer = new BuildTimer({
  maxDuration: 3600000, // 1 hour max
  minDuration: 0,
});

/**
 * POST /api/builds/start
 * Start a new build timer
 */
app.post('/api/builds/start', (req: Request, res: Response) => {
  try {
    const { buildId } = req.body;

    if (!buildId || typeof buildId !== 'string') {
      return res.status(400).json({
        error: 'buildId is required and must be a string',
      });
    }

    const result = buildTimer.startBuild(buildId);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/builds/:buildId/stop
 * Stop a build timer
 */
app.post('/api/builds/:buildId/stop', (req: Request, res: Response) => {
  try {
    const { buildId } = req.params;
    const { status } = req.body;

    const validStatuses = ['completed', 'failed'];
    const finalStatus = status && validStatuses.includes(status) ? status : 'completed';

    const result = buildTimer.stopBuild(buildId, finalStatus);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/builds/:buildId
 * Get build status
 */
app.get('/api/builds/:buildId', (req: Request, res: Response) => {
  try {
    const { buildId } = req.params;
    const build = buildTimer.getBuild(buildId);

    if (!build) {
      return res.status(404).json({
        error: `Build with ID "${buildId}" not found`,
      });
    }

    res.json(build);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/builds
 * Get all builds
 */
app.get('/api/builds', (req: Request, res: Response) => {
  try {
    const builds = buildTimer.getAllBuilds();
    res.json(builds);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/builds/:buildId/validate
 * Validate client-provided end time (security check)
 */
app.post('/api/builds/:buildId/validate', (req: Request, res: Response) => {
  try {
    const { buildId } = req.params;
    const { clientEndTime, toleranceMs } = req.body;

    if (!clientEndTime) {
      return res.status(400).json({
        error: 'clientEndTime is required',
      });
    }

    const endTime = new Date(clientEndTime);
    if (isNaN(endTime.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format for clientEndTime',
      });
    }

    const isValid = buildTimer.validateClientEndTime(
      buildId,
      endTime,
      toleranceMs || 5000
    );

    res.json({
      isValid,
      message: isValid
        ? 'Client time matches server expectations'
        : 'Client time does not match server expectations - possible manipulation detected',
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});
