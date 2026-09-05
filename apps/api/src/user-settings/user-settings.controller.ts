import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import type { UserSettingsService } from './user-settings.service';
import type { CreateUserSettingsDto } from './dto/create-user-settings.dto';
import type { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';

interface UserRequest {
  user?: { sub: string };
}

@Controller('user-settings')
@UseGuards(ClerkAuthGuard)
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  @Post()
  async create(@Request() req: UserRequest, @Body() createUserSettingsDto: CreateUserSettingsDto) {
    // Extract userId from the request (set by ClerkAuthGuard)
    const userId = req.user!.sub; // Assuming Clerk user ID is in sub claim
    return this.userSettingsService.create({
      ...createUserSettingsDto,
      userId,
    });
  }

  @Get()
  async findAll(@Request() req: UserRequest) {
    const userId = req.user!.sub;
    return this.userSettingsService.findByUserId(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.userSettingsService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateUserSettingsDto: UpdateUserSettingsDto) {
    return this.userSettingsService.update(id, updateUserSettingsDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.userSettingsService.remove(id);
  }
}
