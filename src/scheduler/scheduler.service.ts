import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BuildTimerService } from '../build-timer/build-timer.service';
import { BuildStatus } from '../entities/build.entity';

/**
 * SchedulerService - Worker that auto-completes builds
 * 
 * This service:
 * - Polls for builds that have reached their executeAt time
 * - Automatically completes them (no client call needed)
 * - Runs on a schedule (every 5 seconds by default)
 * - Handles long-running builds correctly
 */
@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);
  private isProcessing = false;

  constructor(private readonly buildTimerService: BuildTimerService) {}

  /**
   * On module init, recover any builds that completed during downtime
   */
  async onModuleInit() {
    this.logger.log('Initializing scheduler...');
    const recovered = await this.buildTimerService.recoverCompletedBuilds();
    this.logger.log(`Recovered ${recovered} builds from crash/downtime`);
  }

  /**
   * Cron job that runs every 5 seconds
   * Processes builds that have reached their executeAt time
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async processCompletedBuilds() {
    if (this.isProcessing) {
      return; // Prevent concurrent execution
    }

    this.isProcessing = true;

    try {
      const buildsToComplete = await this.buildTimerService.getBuildsToComplete();

      if (buildsToComplete.length > 0) {
        this.logger.log(`Processing ${buildsToComplete.length} completed build(s)`);

        for (const build of buildsToComplete) {
          try {
            await this.buildTimerService.completeBuild(build.id, BuildStatus.COMPLETED);
            this.logger.log(`Completed build ${build.id} (${build.buildType}) for user ${build.userId}`);
          } catch (error) {
            this.logger.error(`Failed to complete build ${build.id}:`, error);
            // Mark as failed
            await this.buildTimerService.completeBuild(build.id, BuildStatus.FAILED);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error in scheduler:', error);
    } finally {
      this.isProcessing = false;
    }
  }
}
