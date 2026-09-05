import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { OrquestadorModule } from '../orchestrator/orchestrator.module';
import { UserSettingsModule } from '../user-settings/user-settings.module';

@Module({
  imports: [OrquestadorModule, UserSettingsModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
