import { EnvironmentConfigService } from './config/environmentConfigService';
import { DateService } from './date/dateService';
import { WinstonLoggerService } from './logger/winstonLoggerService';
import { UUIDService } from './uuid/uuidService';

export const environmentConfigService = new EnvironmentConfigService();
export const winstonLoggerService = new WinstonLoggerService();
export const uuidService = new UUIDService();
export const dateService = new DateService();
