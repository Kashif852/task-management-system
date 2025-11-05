import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventLog, EventLogDocument } from './schemas/event-log.schema';

export interface LogEventDto {
  action: string;
  userId: string;
  details?: Record<string, unknown>;
}

@Injectable()
export class EventLogService {
  constructor(
    @InjectModel(EventLog.name)
    private eventLogModel: Model<EventLogDocument>,
  ) {}

  async logEvent(logEventDto: LogEventDto): Promise<EventLog> {
    const eventLog = new this.eventLogModel({
      timestamp: new Date(),
      action: logEventDto.action,
      userId: logEventDto.userId,
      details: logEventDto.details || {},
    });

    return eventLog.save();
  }

  async getEventLogs(userId?: string, limit = 100): Promise<EventLog[]> {
    const query = userId ? { userId } : {};
    return this.eventLogModel
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }
}

