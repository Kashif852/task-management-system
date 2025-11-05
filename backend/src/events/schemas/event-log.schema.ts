import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EventLogDocument = EventLog & Document;

@Schema({ timestamps: true })
export class EventLog {
  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ type: Object })
  details: Record<string, unknown>;
}

export const EventLogSchema = SchemaFactory.createForClass(EventLog);

