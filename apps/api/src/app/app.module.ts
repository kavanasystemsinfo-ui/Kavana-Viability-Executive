import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ClerkAuthModule } from '../auth/clerk-auth.module';
import { ViabilityModule } from '../viability/viability.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    // La API exige MongoDB para arrancar: error explícito si falta la URI
    // (KAVANA: errores explícitos antes que fallbacks silenciosos).
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('MONGODB_URI');
        if (!uri) {
          throw new Error(
            'MONGODB_URI no configurada. Define la URI de MongoDB (Atlas o local) en apps/api/.env',
          );
        }
        return {
          uri,
          dbName: config.get<string>('MONGODB_DB') ?? 'kavana_apartaments',
        };
      },
    }),
    ClerkAuthModule,
    ViabilityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
