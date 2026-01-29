/**
 * Server-Authoritative Build Timer
 * 
 * This class manages build timing with server-side validation to prevent
 * client-side manipulation of timestamps.
 */

export interface BuildTimerResult {
  buildId: string;
  startTime: Date;
  endTime: Date | null;
  duration: number | null;
  status: 'running' | 'completed' | 'failed';
  isValid: boolean;
}

export interface BuildTimerOptions {
  maxDuration?: number; // Maximum allowed duration in milliseconds
  minDuration?: number; // Minimum allowed duration in milliseconds
}

export class BuildTimer {
  private builds: Map<string, BuildTimerResult>;
  private options: Required<BuildTimerOptions>;

  constructor(options: BuildTimerOptions = {}) {
    this.builds = new Map();
    this.options = {
      maxDuration: options.maxDuration ?? Infinity,
      minDuration: options.minDuration ?? 0,
    };
  }

  /**
   * Starts a new build timer
   * @param buildId - Unique identifier for the build
   * @returns The build timer result with start time
   */
  startBuild(buildId: string): BuildTimerResult {
    if (this.builds.has(buildId)) {
      throw new Error(`Build with ID "${buildId}" already exists`);
    }

    const startTime = new Date();
    const result: BuildTimerResult = {
      buildId,
      startTime,
      endTime: null,
      duration: null,
      status: 'running',
      isValid: true,
    };

    this.builds.set(buildId, result);
    return result;
  }

  /**
   * Stops a build timer and validates the duration
   * @param buildId - Unique identifier for the build
   * @param status - Final status of the build ('completed' or 'failed')
   * @returns The build timer result with end time and duration
   */
  stopBuild(buildId: string, status: 'completed' | 'failed' = 'completed'): BuildTimerResult {
    const build = this.builds.get(buildId);
    
    if (!build) {
      throw new Error(`Build with ID "${buildId}" not found`);
    }

    if (build.status !== 'running') {
      throw new Error(`Build with ID "${buildId}" is not running`);
    }

    const endTime = new Date();
    const duration = endTime.getTime() - build.startTime.getTime();

    // Server-side validation
    const isValid = this.validateDuration(duration);

    const updatedResult: BuildTimerResult = {
      ...build,
      endTime,
      duration,
      status,
      isValid,
    };

    this.builds.set(buildId, updatedResult);
    return updatedResult;
  }

  /**
   * Gets the current state of a build
   * @param buildId - Unique identifier for the build
   * @returns The build timer result
   */
  getBuild(buildId: string): BuildTimerResult | null {
    return this.builds.get(buildId) || null;
  }

  /**
   * Gets all builds
   * @returns Array of all build timer results
   */
  getAllBuilds(): BuildTimerResult[] {
    return Array.from(this.builds.values());
  }

  /**
   * Validates a duration against configured constraints
   * @param duration - Duration in milliseconds
   * @returns True if duration is valid
   */
  private validateDuration(duration: number): boolean {
    if (duration < this.options.minDuration) {
      return false;
    }

    if (duration > this.options.maxDuration) {
      return false;
    }

    return true;
  }

  /**
   * Validates a client-provided end time against server expectations
   * This is a security measure to detect client-side manipulation
   * @param buildId - Unique identifier for the build
   * @param clientEndTime - End time provided by the client
   * @returns True if the client time matches server expectations (within tolerance)
   */
  validateClientEndTime(buildId: string, clientEndTime: Date, toleranceMs: number = 5000): boolean {
    const build = this.builds.get(buildId);
    
    if (!build || !build.endTime) {
      return false;
    }

    const serverEndTime = build.endTime.getTime();
    const clientTime = clientEndTime.getTime();
    const difference = Math.abs(serverEndTime - clientTime);

    return difference <= toleranceMs;
  }

  /**
   * Clears a build from memory
   * @param buildId - Unique identifier for the build
   */
  clearBuild(buildId: string): void {
    this.builds.delete(buildId);
  }

  /**
   * Clears all builds from memory
   */
  clearAllBuilds(): void {
    this.builds.clear();
  }
}
