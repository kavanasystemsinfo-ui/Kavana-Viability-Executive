import { Controller, Post, Body, Req, BadRequestException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatMessageDto } from './chat-message.dto';
import type { CompanyIdRequest } from '../auth/middleware/company-id.middleware';
import { UserSettingsService } from '../user-settings/user-settings.service';

interface AuthenticatedRequest extends CompanyIdRequest {
  userRole?: string;
  user: { sub: string }; // Assuming the user object from Clerk has a 'sub' field for the user ID
}

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly userSettingsService: UserSettingsService,
  ) {}

  @Post()
  async procesarMensaje(@Body() dto: ChatMessageDto, @Req() req: AuthenticatedRequest) {
    const message = dto.message;
    const companyId = req.companyId;
    const userRole = req.userRole ?? 'viewer'; // default to viewer if undefined
    const userId = req.user.sub; // Get the user ID from the JWT

    if (!companyId) {
      throw new BadRequestException('companyId is missing from request');
    }

    // Get the user's LLM settings
    const userSettings = await this.userSettingsService.findByUserId(userId);
    if (!userSettings) {
      throw new BadRequestException(
        'User settings not found. Please configure your LLM provider in Settings.',
      );
    }

    return this.chatService.procesarMensaje(message, companyId, userRole, userSettings);
  }
}
