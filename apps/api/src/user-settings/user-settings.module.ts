import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSettingsService } from './user-settings.service';
import { UserSettingsController } from './user-settings.controller';
import { UserSettings, UserSettingsSchema } from './user-settings.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: UserSettings.name, schema: UserSettingsSchema }])],
  providers: [UserSettingsService],
  controllers: [UserSettingsController],
  exports: [UserSettingsService],
})
export class UserSettingsModule {}
