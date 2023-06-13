import type { PrismaClient } from '@prisma/client';

import type { AccessTokenPayload } from '../../domain/accessTokenPayload';
import type { IInteractor } from '../../interactors';
import type { ResultType } from '../../interactors/result';
import { Result } from '../../interactors/result';
import type { IConfigService } from '../../services/config';
import type { ICryptoService } from '../../services/crypto';
import type { IDateService } from '../../services/date';
import type { IJWTService } from '../../services/jwt';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';

export type RefreshRequestDTO = {
  /** uuid */
  id: string;
  /** base64 */
  token: string;
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

export type RefreshResponseDTO = {
  accessTokenPayload: AccessTokenPayload;
  cookies: Cookie[];
};

export class RefreshTokenNotFound extends Error {}
export class RefreshTokenExpired extends Error {}
export class RefreshUserExpired extends Error {}

export class RefreshInteractor implements IInteractor<RefreshRequestDTO, RefreshResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly configService: IConfigService,
    private readonly dateService: IDateService,
    private readonly jwtService: IJWTService,
    private readonly cryptoService: ICryptoService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ id, token }: RefreshRequestDTO): Promise<ResultType<RefreshResponseDTO>> {
    try {
      // look up the refresh token
      const idBin = this.uuidService.uuidToBin(id);
      const tokenBin = Buffer.from(token, 'base64');
      const refreshToken = await this.prisma.refreshToken.findUnique({
        where: { refreshTokenId: idBin, token: tokenBin },
        include: { user: true },
      });
      if (!refreshToken) {
        return Result.fail(new RefreshTokenNotFound());
      }

      // make sure it's not expired
      const tokenExpiry = this.dateService.fixPrismaReadDate(refreshToken.expiry);
      if (tokenExpiry < this.dateService.getDate()) {
        return Result.fail(new RefreshTokenExpired());
      }

      // make sure user account is not expired
      if (refreshToken.user.expiry) {
        const userExpiry = this.dateService.fixPrismaReadDate(refreshToken.user.expiry);
        if (userExpiry <= this.dateService.getDate()) {
          return Result.fail(new RefreshUserExpired());
        }
      }

      // determine when the new access token should expire
      const accessExp = Math.floor(this.dateService.getDate().getTime() / 1000) + this.configService.config.auth.accessTokenLifetime;

      // generate a cryptographically suitable pseudo-random value for the XSRF token
      const xsrfTokenBytes = await this.cryptoService.randomBytes(16); // 128 bits of entropy
      const xsrfTokenString = xsrfTokenBytes.toString('base64');

      // create a new jwt access token
      const accessTokenPayload: AccessTokenPayload = {
        id: refreshToken.userId,
        exp: accessExp,
        xsrf: xsrfTokenString, // store the XSRF token in the payload
        privileges: {
          deleteEnrollment: refreshToken.user.deleteEnrollmentPriv,
          void: refreshToken.user.voidPriv,
        },
      };
      const accessToken = await this.jwtService.sign(accessTokenPayload);

      const baseCookieOptions = {
        secure: this.configService.config.environment === 'production',
        httpOnly: true,
        domain: this.configService.config.auth.cookieDomain,
        sameSite: 'strict',
      } as const;

      const accessCookieOptions = {
        ...baseCookieOptions,
        path: this.configService.config.auth.accessCookiePath ?? this.configService.config.auth.cookiePath,
        maxAge: this.configService.config.auth.accessTokenLifetime * 1000,
      };

      return Result.success({
        accessTokenPayload,
        cookies: [
          { name: 'accessToken', value: accessToken, options: accessCookieOptions },
          { name: 'XSRF-TOKEN', value: xsrfTokenString, options: { ...accessCookieOptions, path: '/', httpOnly: false } }, // path '/' and httpOnly false for Angular CSRF
        ],
      });
    } catch (err) {
      this.logger.error('error refreshing user', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
