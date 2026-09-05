import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type UserSettingsDocument = HydratedDocument<UserSettings>;

@Schema({ timestamps: true })
export class UserSettings {
  @Prop({ required: true })
  userId!: string;

  @Prop()
  companyId?: string;

  @Prop({ required: true })
  llmProvider!: string;

  @Prop({ required: true })
  modelName!: string;

  @Prop({ required: true })
  apiKey!: string; // encrypted

  @Prop({ required: true, default: 0 })
  maxTokensPerDay!: number;

  @Prop({ required: true, default: 0 })
  maxRequestsPerDay!: number;
}

export const UserSettingsSchema = SchemaFactory.createForClass(UserSettings);
