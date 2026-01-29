import { BuildTimer, BuildTimerResult } from './BuildTimer';

describe('BuildTimer', () => {
  let timer: BuildTimer;

  beforeEach(() => {
    timer = new BuildTimer({
      maxDuration: 3600000, // 1 hour
      minDuration: 100, // 100ms minimum
    });
  });

  afterEach(() => {
    timer.clearAllBuilds();
  });

  describe('startBuild', () => {
    it('should start a new build with valid start time', () => {
      const result = timer.startBuild('build-1');

      expect(result.buildId).toBe('build-1');
      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.endTime).toBeNull();
      expect(result.duration).toBeNull();
      expect(result.status).toBe('running');
      expect(result.isValid).toBe(true);
    });

    it('should throw error if build ID already exists', () => {
      timer.startBuild('build-1');
      
      expect(() => {
        timer.startBuild('build-1');
      }).toThrow('Build with ID "build-1" already exists');
    });
  });

  describe('stopBuild', () => {
    it('should stop a running build and calculate duration', async () => {
      timer.startBuild('build-1');
      
      // Wait a bit to ensure duration > 0
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const result = timer.stopBuild('build-1', 'completed');

      expect(result.endTime).toBeInstanceOf(Date);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.status).toBe('completed');
      expect(result.isValid).toBe(true);
    });

    it('should mark build as failed when status is failed', async () => {
      timer.startBuild('build-1');
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const result = timer.stopBuild('build-1', 'failed');

      expect(result.status).toBe('failed');
      expect(result.isValid).toBe(true);
    });

    it('should throw error if build does not exist', () => {
      expect(() => {
        timer.stopBuild('non-existent');
      }).toThrow('Build with ID "non-existent" not found');
    });

    it('should throw error if build is already stopped', () => {
      timer.startBuild('build-1');
      timer.stopBuild('build-1');
      
      expect(() => {
        timer.stopBuild('build-1');
      }).toThrow('Build with ID "build-1" is not running');
    });

    it('should invalidate build if duration is below minimum', async () => {
      timer.startBuild('build-1');
      
      // Stop immediately (duration < 100ms)
      const result = timer.stopBuild('build-1');

      expect(result.isValid).toBe(false);
    });

    it('should invalidate build if duration exceeds maximum', () => {
      const shortTimer = new BuildTimer({
        maxDuration: 100, // 100ms max
        minDuration: 0,
      });

      shortTimer.startBuild('build-1');
      
      // Manually manipulate the start time to simulate a long build
      const build = shortTimer.getBuild('build-1');
      if (build) {
        build.startTime = new Date(Date.now() - 200); // 200ms ago
      }
      
      const result = shortTimer.stopBuild('build-1');
      expect(result.isValid).toBe(false);
    });
  });

  describe('getBuild', () => {
    it('should return build if it exists', () => {
      timer.startBuild('build-1');
      const build = timer.getBuild('build-1');

      expect(build).not.toBeNull();
      expect(build?.buildId).toBe('build-1');
    });

    it('should return null if build does not exist', () => {
      const build = timer.getBuild('non-existent');
      expect(build).toBeNull();
    });
  });

  describe('getAllBuilds', () => {
    it('should return all builds', () => {
      timer.startBuild('build-1');
      timer.startBuild('build-2');
      timer.startBuild('build-3');

      const builds = timer.getAllBuilds();
      expect(builds.length).toBe(3);
    });

    it('should return empty array if no builds exist', () => {
      const builds = timer.getAllBuilds();
      expect(builds.length).toBe(0);
    });
  });

  describe('validateClientEndTime', () => {
    it('should return true if client time matches server time within tolerance', async () => {
      timer.startBuild('build-1');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = timer.stopBuild('build-1');
      const isValid = timer.validateClientEndTime(
        'build-1',
        result.endTime!,
        5000
      );

      expect(isValid).toBe(true);
    });

    it('should return false if client time differs significantly', async () => {
      timer.startBuild('build-1');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      timer.stopBuild('build-1');
      
      // Provide a time that's way off
      const fakeTime = new Date(Date.now() - 10000); // 10 seconds ago
      const isValid = timer.validateClientEndTime('build-1', fakeTime, 1000);

      expect(isValid).toBe(false);
    });

    it('should return false if build does not exist', () => {
      const isValid = timer.validateClientEndTime(
        'non-existent',
        new Date(),
        5000
      );
      expect(isValid).toBe(false);
    });

    it('should return false if build has not ended', () => {
      timer.startBuild('build-1');
      
      const isValid = timer.validateClientEndTime(
        'build-1',
        new Date(),
        5000
      );
      expect(isValid).toBe(false);
    });
  });

  describe('clearBuild', () => {
    it('should remove a build from memory', () => {
      timer.startBuild('build-1');
      expect(timer.getBuild('build-1')).not.toBeNull();

      timer.clearBuild('build-1');
      expect(timer.getBuild('build-1')).toBeNull();
    });
  });

  describe('clearAllBuilds', () => {
    it('should remove all builds from memory', () => {
      timer.startBuild('build-1');
      timer.startBuild('build-2');
      timer.startBuild('build-3');

      expect(timer.getAllBuilds().length).toBe(3);

      timer.clearAllBuilds();
      expect(timer.getAllBuilds().length).toBe(0);
    });
  });
});
