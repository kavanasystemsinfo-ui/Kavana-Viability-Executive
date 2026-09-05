import { IsOptional, IsString } from 'class-validator';

export class UpdateUserSettingsDto {
  @IsOptional()
  @IsString()
  llmProvider?: string;

  @IsOptional()
  @IsString()
  modelName?: string;

  @IsOptional()
  apiKey?: string; // encrypted

  @IsOptional()
  maxTokensPerDay?: number;

  @IsOptional()
  maxRequestsPerDay?: number;
}
