import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsGateway } from './events.gateway';
import { EventLogService } from './event-log.service';
import { EventLog, EventLogSchema } from './schemas/event-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: EventLog.name, schema: EventLogSchema }]),
  ],
  providers: [EventsGateway, EventLogService],
  exports: [EventsGateway, EventLogService],
})
export class EventsModule {}

