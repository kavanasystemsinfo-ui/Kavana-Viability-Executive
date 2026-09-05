import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { UserSettingsDocument } from './user-settings.schema';
import { UserSettings } from './user-settings.schema';
import * as crypto from 'crypto';

@Injectable()
export class UserSettingsService {
  private readonly encryptionKey: Buffer;
  private readonly ivLength = 16; // For AES-256-CBC

  constructor(
    @InjectModel(UserSettings.name) private readonly userSettingsModel: Model<UserSettingsDocument>,
  ) {
    const keyEnv = process.env.API_KEY_ENCRYPTION_KEY;
    if (!keyEnv) {
      throw new InternalServerErrorException(
        'API_KEY_ENCRYPTION_KEY environment variable is not set',
      );
    }
    // Expecting a base64-encoded 32-byte key (256 bits)
    this.encryptionKey = Buffer.from(keyEnv, 'base64');
    if (this.encryptionKey.length !== 32) {
      throw new InternalServerErrorException(
        'API_KEY_ENCRYPTION_KEY must be a 32-byte base64 string',
      );
    }
  }

  private encryptApiKey(apiKey: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(apiKey, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return `${iv.toString('base64')}:${encrypted}`;
  }

  private decryptApiKey(encryptedData: string): string {
    const [ivBase64, encryptedBase64] = encryptedData.split(':');
    if (!ivBase64 || !encryptedBase64) {
      throw new InternalServerErrorException('Invalid encrypted API key format');
    }
    const iv = Buffer.from(ivBase64, 'base64');
    const encrypted = Buffer.from(encryptedBase64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async create(userSettingsDto: Partial<UserSettings>): Promise<UserSettings> {
    // Encrypt the apiKey before saving
    if (userSettingsDto.apiKey) {
      userSettingsDto.apiKey = this.encryptApiKey(userSettingsDto.apiKey);
    }
    const createdUserSettings = new this.userSettingsModel(userSettingsDto);
    return createdUserSettings.save();
  }

  async findAll(): Promise<UserSettings[]> {
    const settings = await this.userSettingsModel.find().exec();
    // Decrypt apiKey for each setting
    return settings.map((setting) => {
      const settingObj = setting.toObject();
      if (settingObj.apiKey) {
        settingObj.apiKey = this.decryptApiKey(settingObj.apiKey);
      }
      return settingObj;
    });
  }

  async findOne(id: string): Promise<UserSettings | null> {
    const setting = await this.userSettingsModel.findById(id).exec();
    if (!setting) {
      return null;
    }
    const settingObj = setting.toObject();
    if (settingObj.apiKey) {
      settingObj.apiKey = this.decryptApiKey(settingObj.apiKey);
    }
    return settingObj;
  }

  async findByUserId(userId: string): Promise<UserSettings | null> {
    const setting = await this.userSettingsModel.findOne({ userId }).exec();
    if (!setting) {
      return null;
    }
    const settingObj = setting.toObject();
    if (settingObj.apiKey) {
      settingObj.apiKey = this.decryptApiKey(settingObj.apiKey);
    }
    return settingObj;
  }

  async update(id: string, updateDto: Partial<UserSettings>): Promise<UserSettings | null> {
    // Encrypt the apiKey if it's being updated
    if (updateDto.apiKey) {
      updateDto.apiKey = this.encryptApiKey(updateDto.apiKey);
    }
    const updatedSetting = await this.userSettingsModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
    if (!updatedSetting) {
      return null;
    }
    const settingObj = updatedSetting.toObject();
    if (settingObj.apiKey) {
      settingObj.apiKey = this.decryptApiKey(settingObj.apiKey);
    }
    return settingObj;
  }

  async remove(id: string): Promise<any> {
    return this.userSettingsModel.findByIdAndDelete(id).exec();
  }
}