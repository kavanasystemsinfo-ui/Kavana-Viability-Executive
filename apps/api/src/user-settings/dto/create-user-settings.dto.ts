import { IsString, IsInt, Min, IsOptional } from 'class-validator';

export class CreateUserSettingsDto {
  @IsString()
  llmProvider!: string;

  @IsString()
  modelName!: string;

  @IsString()
  apiKey!: string; // will be encrypted in service

  @IsInt()
  @Min(0)
  maxTokensPerDay!: number;

  @IsInt()
  @Min(0)
  maxRequestsPerDay!: number;

  @IsOptional()
  @IsString()
  companyId?: string;
}