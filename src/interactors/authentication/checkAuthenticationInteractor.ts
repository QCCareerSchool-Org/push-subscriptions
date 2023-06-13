import * as yup from 'yup';

import type { IInteractor } from '..';
import type { AccessTokenPayload } from '../../domain/accessTokenPayload';
import type { IJWTService } from '../../services/jwt';
import type { ILoggerService } from '../../services/logger';
import type { ResultType } from '../result';
import { Result } from '../result';

type CheckAuthenticationRequestDTO = {
  accessToken: string;
  xsrfToken?: string;
  checkXsrf: boolean;
};

type CheckAuthenticationResponseDTO = AccessTokenPayload;

export class CheckAuthenticationVerifyError extends Error { }
export class CheckAuthenticationInvalidPayload extends Error { }
export class CheckAuthenticationMissingXSRF extends Error { }
export class CheckAuthenticationInvalidXSRF extends Error { }

export class CheckAuthenticationInteractor implements IInteractor<CheckAuthenticationRequestDTO, CheckAuthenticationResponseDTO> {

  public constructor(
    private readonly jwtService: IJWTService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ accessToken, xsrfToken, checkXsrf }: CheckAuthenticationRequestDTO): Promise<ResultType<AccessTokenPayload>> {
    try {
      let decoded: unknown;
      try {
        decoded = await this.jwtService.verify(accessToken);
      } catch (err: unknown) {
        return Result.fail(new CheckAuthenticationVerifyError());
      }

      const schema = yup.object({ // const schema: yup.Schema<AccessTokenPayload> = yup.object({
        id: yup.number().defined(),
        exp: yup.number().defined(),
        xsrf: yup.string().defined(),
        privileges: yup.object({
          deleteEnrollment: yup.boolean().defined(),
          void: yup.boolean().defined(),
        }).defined(),
      });

      let accessTokenPayload: AccessTokenPayload;
      try {
        accessTokenPayload = await schema.validate(decoded);
      } catch (err: unknown) {
        if (err instanceof Error) {
          this.logger.error(err.message);
        }
        return Result.fail(new CheckAuthenticationInvalidPayload());
      }

      if (checkXsrf) {
        if (typeof xsrfToken === 'undefined') {
          return Result.fail(new CheckAuthenticationMissingXSRF());
        }
        if (xsrfToken !== accessTokenPayload.xsrf) {
          return Result.fail(new CheckAuthenticationInvalidXSRF());
        }
      }

      return Result.success<CheckAuthenticationResponseDTO>(accessTokenPayload);

    } catch (err) {
      this.logger.error('error checking authentication', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
