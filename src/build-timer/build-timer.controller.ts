import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { BuildTimerService } from './build-timer.service';
import { StartBuildDto } from './dto/start-build.dto';
import { Build } from '../entities/build.entity';

@Controller('api/builds')
export class BuildTimerController {
  constructor(private readonly buildTimerService: BuildTimerService) {}

  /**
   * POST /api/builds/start
   * Start a new build with atomic resource deduction
   */
  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  async startBuild(@Body() dto: StartBuildDto): Promise<Build> {
    return this.buildTimerService.startBuild(dto);
  }

  /**
   * GET /api/builds/:buildId
   * Get build status
   */
  @Get(':buildId')
  async getBuild(@Param('buildId') buildId: string): Promise<Build> {
    return this.buildTimerService.getBuild(buildId);
  }

  /**
   * GET /api/builds/user/:userId
   * Get all builds for a user
   */
  @Get('user/:userId')
  async getUserBuilds(@Param('userId') userId: string): Promise<Build[]> {
    return this.buildTimerService.getUserBuilds(userId);
  }

  /**
   * Note: There is NO /stop endpoint
   * Builds are completed automatically by the scheduler based on executeAt
   */
}
