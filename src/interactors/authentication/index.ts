import { prisma } from '../../frameworks/prisma';
import { dateService, environmentConfigService, ipaddrJSIPAddressService, jwtService, nodeCryptoService, uuidService, winstonLoggerService } from '../../services';
import { CheckAuthenticationInteractor } from './checkAuthenticationInteractor';
import { LoginInteractor } from './loginInteractor';
import { LogoutInteractor } from './logoutInteractor';
import { RefreshInteractor } from './refreshInteractor';

// use-case interactor singletons
export const checkAuthenticationInteractor = new CheckAuthenticationInteractor(jwtService, winstonLoggerService);
export const loginInteractor = new LoginInteractor(prisma, environmentConfigService, dateService, jwtService, nodeCryptoService, uuidService, ipaddrJSIPAddressService, winstonLoggerService);
export const logoutInteractor = new LogoutInteractor(prisma, uuidService, winstonLoggerService);
export const refreshInteractor = new RefreshInteractor(prisma, uuidService, environmentConfigService, dateService, jwtService, nodeCryptoService, winstonLoggerService);
