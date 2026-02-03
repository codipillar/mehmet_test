import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { BuildTimerModule } from './build-timer/build-timer.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { AppController } from './app.controller';

@Module({
  imports: [DatabaseModule, BuildTimerModule, SchedulerModule],
  controllers: [AppController],
})
export class AppModule {}
