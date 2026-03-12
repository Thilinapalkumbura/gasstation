import { Module } from '@nestjs/common';
import { WorkerChangesController } from './worker-changes.controller';
import { WorkerChangesService } from './worker-changes.service';

@Module({
  controllers: [WorkerChangesController],
  providers: [WorkerChangesService],
  exports: [WorkerChangesService],
})
export class WorkerChangesModule {}
