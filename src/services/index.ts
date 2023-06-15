import { jwtPrivateKey, jwtPublicKey } from '../jwtKeys';
import { EnvironmentConfigService } from './config/environmentConfigService';
import { NodeCryptoService } from './crypto/nodeCryptoService';
import { DateService } from './date/dateService';
import { IpaddrJSIPAddressService } from './ipaddress/ipaddrIPAddressService';
import { JWTService } from './jwt/jwtService';
import { WinstonLoggerService } from './logger/winstonLoggerService';
import { WebPushPushService } from './push/webPushPushService';
import { UUIDService } from './uuid/uuidService';

export const environmentConfigService = new EnvironmentConfigService();
export const winstonLoggerService = new WinstonLoggerService();
export const uuidService = new UUIDService();
export const dateService = new DateService();
export const nodeCryptoService = new NodeCryptoService();
export const jwtService = new JWTService(jwtPrivateKey, jwtPublicKey);
export const ipaddrJSIPAddressService = new IpaddrJSIPAddressService();
export const webPushPushService = new WebPushPushService(environmentConfigService.config.vapid.privateKey, environmentConfigService.config.vapid.publicKey);
