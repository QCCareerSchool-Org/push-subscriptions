import { privateKey, publicKey } from '../keys';
import { EnvironmentConfigService } from './config/environmentConfigService';
import { NodeCryptoService } from './crypto/nodeCryptoService';
import { DateService } from './date/dateService';
import { IpaddrJSIPAddressService } from './ipaddress/ipaddrIPAddressService';
import { JWTService } from './jwt/jwtService';
import { WinstonLoggerService } from './logger/winstonLoggerService';
import { UUIDService } from './uuid/uuidService';

export const environmentConfigService = new EnvironmentConfigService();
export const winstonLoggerService = new WinstonLoggerService();
export const uuidService = new UUIDService();
export const dateService = new DateService();
export const nodeCryptoService = new NodeCryptoService();
export const jwtService = new JWTService(privateKey, publicKey);
export const ipaddrJSIPAddressService = new IpaddrJSIPAddressService();
