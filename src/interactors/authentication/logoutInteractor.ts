import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';

type LogoutRequestDTO = {
  /** uuid */
  id?: string;
  /** base64 */
  token?: string;
};

type LogoutResponseDTO = void;

export class LogoutTokenNotFound extends Error { }
export class LogoutTokenInvalidType extends Error { }
export class LogoutTokenInvalid extends Error { }

export class LogoutInteractor implements IInteractor<LogoutRequestDTO, LogoutResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ id, token }: LogoutRequestDTO): Promise<ResultType<LogoutResponseDTO>> {
    try {

      if (typeof id !== 'undefined' && typeof token !== 'undefined') {

        const idBin = this.uuidService.uuidToBin(id);
        const refreshToken = await this.prisma.refreshToken.findUnique({ where: { refreshTokenId: idBin } });
        if (!refreshToken) {
          return Result.fail(new LogoutTokenNotFound());
        }

        // don't wory if it's expired

        // make sure the correct token was supplied
        const tokenBin = Buffer.from(token, 'base64');
        if (!refreshToken.token.equals(tokenBin)) {
          return Result.fail(new LogoutTokenInvalid());
        }

        await this.prisma.refreshToken.delete({ where: { refreshTokenId: idBin } });
      }

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error logging out', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
