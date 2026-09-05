import { InjectionToken } from '@angular/core';
import type { FactoryProvider } from '@angular/core';
import type { ApiService } from './api.service';
import { RealApiService } from './real-api.service';
import { FixtureApiService } from './fixture-api.service';
import { environment } from '../../../environments/environment';

export const API_SERVICE = new InjectionToken<ApiService>('api.service');

export function apiServiceFactory(): ApiService {
  return environment.useFixtureApi ? new FixtureApiService() : new RealApiService();
}

export const apiServiceProvider: FactoryProvider = {
  provide: API_SERVICE,
  useFactory: apiServiceFactory,
};
