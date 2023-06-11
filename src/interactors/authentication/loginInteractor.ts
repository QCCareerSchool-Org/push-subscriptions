import path from 'path';
import type { Administrator, PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

import type { IInteractor } from '..';
import type { AccessTokenPayload } from '../../domain/accessTokenPayload';
import { isValidStudentType } from '../../domain/studentType';
import type { IConfigService } from '../../services/config';
import type { ICryptoService } from '../../services/crypto';
import type { IDateService } from '../../services/date';
import type { IIPAddressService } from '../../services/ipaddress';
import type { IJWTService } from '../../services/jwt';
import type { ILoggerService } from '../../services/logger';
import type { IStudentService } from '../../services/student';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';

type LoginRequestDTO = {
  username: string;
  password: string;
  stayLoggedIn?: boolean;
  ipAddress: string | null;
  browser: string | null;
  browserVersion: string | null;
  mobile: boolean | null;
  os: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
};

type CookieOptions = {
  maxAge?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
};

type Cookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

type LoginResponseDTO = {
  accessTokenPayload: AccessTokenPayload;
  cookies: Cookie[];
};

export class LoginNotFound extends Error { }
export class LoginNoPasswordHash extends Error { }
export class LoginWrongPassword extends Error { }
export class LoginExpired extends Error { }
export class LoginArears extends Error { }

export class LoginInteractor implements IInteractor<LoginRequestDTO, LoginResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly configService: IConfigService,
    private readonly dateService: IDateService,
    private readonly jwtService: IJWTService,
    private readonly cryptoService: ICryptoService,
    private readonly uuidService: IUUIDService,
    private readonly ipAddressService: IIPAddressService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: LoginRequestDTO): Promise<ResultType<LoginResponseDTO>> {
    try {
      const lookup = await this.getAccount(request.username);
      if (!lookup) {
        return Result.fail(new LoginNotFound());
      }

      const [ accountId, account ] = lookup;

      if (account.passwordHash === null) {
        return Result.fail(new LoginNoPasswordHash());
      }

      const passwordMatches = await this.cryptoService.verify(request.password, account.passwordHash);
      if (!passwordMatches) {
        return Result.fail(new LoginWrongPassword());
      }

      if (account.expiry) {
        const expiry = this.dateService.fixPrismaReadDate(account.expiry);
        if (expiry <= this.dateService.getDate()) {
          return Result.fail(new LoginExpired());
        }
      }

      if (accountType === 'student') {
        if ((account as Student).arrears) {
          return Result.fail(new LoginArears());
        }
      }

      // determine when the access token should expire
      const accessExp = Math.floor(Date.now() / 1000) + this.configService.config.auth.accessTokenLifetime;

      // generate a cryptographically suitable pseudo-random value for the XSRF token
      const xsrfTokenBytes = await this.cryptoService.randomBytes(16); // 128 bits of entropy
      const xsrfTokenString = xsrfTokenBytes.toString('base64');

      // create a jwt access token
      const accessTokenPayload: AccessTokenPayload = {
        studentCenter: {
          id: accountId,
          type: accountType,
        },
        exp: accessExp,
        xsrf: xsrfTokenString, // store the XSRF token in the payload
      };
      if (accountType === 'admin') {
        const adminAccount = account as Administrator;
        accessTokenPayload.studentCenter.privileges = {
          submissionPriceChange: adminAccount.submissionPricePriv,
          courseDevelopment: adminAccount.courseDevelopmentPriv,
          delete: adminAccount.deletePriv,
        };
        if (adminAccount.apiUsername !== null) {
          accessTokenPayload.crm = {
            id: adminAccount.apiUsername,
            type: 'admin',
          };
        }
      }
      if (accountType === 'student') { // add student-only data to payload
        const studentAccount = account as Student;
        if (isValidStudentType(studentAccount.studentTypeId)) {
          accessTokenPayload.studentCenter.studentType = studentAccount.studentTypeId;
          if (studentAccount.apiUsername !== null) {
            accessTokenPayload.crm = {
              id: studentAccount.apiUsername,
              type: 'student',
            };
          }
        }
      }
      const accessToken = await this.jwtService.sign(accessTokenPayload);

      // create a cryptographically suitable pseudo-random value for the refresh token
      const refreshTokenBytes = await this.cryptoService.randomBytes(64); // 64 * 8 = 512 bits of entropy
      const refreshTokenString = refreshTokenBytes.toString('base64');

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      // store a the refresh token in the database
      await this.prisma.refreshToken.create({
        data: {
          refreshTokenId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
          studentId: accountType === 'student' ? accountId : null,
          tutorId: accountType === 'tutor' ? accountId : null,
          administratorId: accountType === 'admin' ? accountId : null,
          token: refreshTokenBytes,
          expiry: new Date(prismaNow.getTime() + (this.configService.config.auth.refreshTokenLifetime * 1000)),
          ipAddress: request.ipAddress === null ? null : this.ipAddressService.parse(request.ipAddress),
          browser: request.browser,
          browserVersion: request.browserVersion,
          mobile: request.mobile,
          os: request.os,
          city: request.city,
          country: request.country,
          latitude: request.latitude === null ? null : new Prisma.Decimal(request.latitude),
          longitude: request.longitude === null ? null : new Prisma.Decimal(request.longitude),
          created: prismaNow,
          modified: prismaNow,
          entityVersion: 0,
        },
      });

      const baseCookieOptions = {
        secure: this.configService.config.environment === 'production',
        httpOnly: true,
        domain: this.configService.config.auth.cookieDomain,
        sameSite: 'strict',
      } as const;

      const accessCookieOptions: CookieOptions = {
        ...baseCookieOptions,
        path: this.configService.config.auth.accessCookiePath ?? this.configService.config.auth.cookiePath,
        maxAge: this.configService.config.auth.accessTokenLifetime * 1000,
      };

      const refreshCookieOptions: CookieOptions = {
        ...baseCookieOptions,
        path: path.join(this.configService.config.auth.cookiePath, '/v1/auth/refresh'),
      };

      if (request.stayLoggedIn) {
        refreshCookieOptions.maxAge = this.configService.config.auth.refreshTokenLifetime * 1000;
      }

      return Result.success({
        accessTokenPayload,
        cookies: [
          { name: 'accessToken', value: accessToken, options: accessCookieOptions },
          { name: 'XSRF-TOKEN', value: xsrfTokenString, options: { ...accessCookieOptions, path: '/', httpOnly: false } }, // path '/' and httpOnly false for Angular CSRF
          { name: 'refreshToken', value: refreshTokenString, options: refreshCookieOptions },
        ],
      });

    } catch (err) {
      this.logger.error('error authenticating user', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async getAccount(username: string): Promise<[number, Account] | null> {
    const administrator = await this.prisma.administrator.findUnique({ where: { username } });
    if (administrator) {
      return [ administrator.administratorId, administrator ];
    }

    // no admin, tutor, or student
    return null;
  }
}
