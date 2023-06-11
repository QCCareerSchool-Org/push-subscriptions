import { prisma } from '../../frameworks/prisma/index.js';
import { dateService, environmentConfigService, ipaddrJSIPAddressService, jwtService, nodeCryptoService, studentService, uuidService, winstonLoggerService } from '../../services/index.js';
import { CheckAuthenticationInteractor } from './checkAuthenticationInteractor.js';
import { LoginInteractor } from './loginInteractor.js';
import { LogoutInteractor } from './logoutInteractor.js';
import { RefreshInteractor } from './refreshInteractor.js';

// use-case interactor singletons
export const checkAuthenticationInteractor = new CheckAuthenticationInteractor(jwtService, winstonLoggerService);
export const loginInteractor = new LoginInteractor(prisma, environmentConfigService, dateService, jwtService, nodeCryptoService, uuidService, ipaddrJSIPAddressService, studentService, winstonLoggerService);
export const logoutInteractor = new LogoutInteractor(prisma, winstonLoggerService);
export const refreshInteractor = new RefreshInteractor(prisma, environmentConfigService, dateService, jwtService, nodeCryptoService, winstonLoggerService);
