import * as yup from 'yup';

import type { AccessTokenPayload } from '../../domain/accessTokenPayload';
import { refreshInteractor } from '../../interactors/authentication';
import { RefreshTokenExpired, RefreshTokenNotFound, RefreshUserExpired } from '../../interactors/authentication/refreshInteractor';
import { BaseController } from '../baseController';

type Request = {
  cookies: {
    refreshTokenId: string;
    refreshToken: string;
  };
};

type Response = AccessTokenPayload;

export class RefreshController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const cookiesSchema: yup.Schema<Request['cookies']> = yup.object({
      refreshTokenId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(), // uuid
      refreshToken: yup.string().defined().matches(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u), // base64
    });
    try {
      const cookies = await cookiesSchema.validate(this.req.cookies);
      return { cookies };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ cookies }: Request): Promise<void> {
    if (!this.isPostMethod()) {
      return this.methodNotAllowed();
    }

    const result = await refreshInteractor.execute({ id: cookies.refreshTokenId, token: cookies.refreshToken });

    if (result.success) {
      const { accessTokenPayload, cookies: setCookies } = result.value;

      // send all the cookies
      for (const c of setCookies) {
        this.sendCookie(c.name, c.value, c.options.maxAge, c.options.path, c.options.domain, c.options.secure, c.options.httpOnly, c.options.sameSite);
      }

      // return the payload
      return this.ok(accessTokenPayload);
    }

    switch (result.error.constructor) {
      case RefreshTokenNotFound:
      case RefreshTokenExpired:
        return this.badRequest('Refresh token not found');
      case RefreshUserExpired:
        return this.badRequest('Account is expired');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
