import path from 'path';
import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

import type { IInteractor } from '..';
import type { AccessTokenPayload } from '../../domain/accessTokenPayload';
import type { IConfigService } from '../../services/config';
import type { ICryptoService } from '../../services/crypto';
import type { IDateService } from '../../services/date';
import type { IIPAddressService } from '../../services/ipaddress';
import type { IJWTService } from '../../services/jwt';
import type { ILoggerService } from '../../services/logger';
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

export class LoginUserNotFound extends Error { }
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
      const user = await this.prisma.user.findUnique({ where: { username: request.username } });
      if (!user) {
        return Result.fail(new LoginUserNotFound());
      }

      if (user.passwordHash === null) {
        return Result.fail(new LoginNoPasswordHash());
      }

      const passwordMatches = await this.cryptoService.verify(request.password, user.passwordHash);
      if (!passwordMatches) {
        return Result.fail(new LoginWrongPassword());
      }

      if (user.expiry) {
        const expiry = this.dateService.fixPrismaReadDate(user.expiry);
        if (expiry <= this.dateService.getDate()) {
          return Result.fail(new LoginExpired());
        }
      }

      // determine when the access token should expire
      const accessExp = Math.floor(Date.now() / 1000) + this.configService.config.auth.accessTokenLifetime;

      // generate a cryptographically suitable pseudo-random value for the XSRF token
      const xsrfTokenBytes = await this.cryptoService.randomBytes(16); // 128 bits of entropy
      const xsrfTokenString = xsrfTokenBytes.toString('base64');

      // create a jwt access token
      const accessTokenPayload: AccessTokenPayload = {
        id: user.userId,
        exp: accessExp,
        xsrf: xsrfTokenString, // store the XSRF token in the payload
        privileges: {
          deleteEnrollment: user.deleteEnrollmentPriv,
          void: user.voidPriv,
        },
      };

      const accessToken = await this.jwtService.sign(accessTokenPayload);

      // create a cryptographically suitable pseudo-random value for the refresh token
      const refreshTokenBytes = await this.cryptoService.randomBytes(64); // 64 * 8 = 512 bits of entropy
      const refreshTokenString = refreshTokenBytes.toString('base64');
      const refreshTokenId = this.uuidService.createUUID();

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      // store a the refresh token in the database
      await this.prisma.refreshToken.create({
        data: {
          refreshTokenId: this.uuidService.uuidToBin(refreshTokenId),
          userId: user.userId,
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
          { name: 'refreshTokenId', value: refreshTokenId, options: refreshCookieOptions },
        ],
      });

    } catch (err) {
      this.logger.error('error authenticating user', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
