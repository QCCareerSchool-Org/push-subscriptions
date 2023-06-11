import * as yup from 'yup';

import type { AccessTokenPayload } from '../../domain/accessTokenPayload';
import { refreshInteractor } from '../../interactors/authentication';
import { RefreshAccountNotFound, RefreshStudentInvalidType, RefreshTokenExpired, RefreshTokenInvalidType, RefreshTokenNotFound } from '../../interactors/authentication/refreshInteractor';
import { BaseController } from '../baseController';

type Request = {
  cookies: {
    refreshToken: string;
  };
};

type Response = AccessTokenPayload;

export class RefreshController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const cookiesSchema: yup.Schema<Request['cookies']> = yup.object({
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
    const token = Buffer.from(cookies.refreshToken, 'base64');

    const result = await refreshInteractor.execute({ token });

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
      case RefreshTokenInvalidType:
        return this.badRequest('Invalid refresh token type');
      case RefreshAccountNotFound:
        return this.internalServerError('Unable to find associated account');
      case RefreshStudentInvalidType:
        return this.internalServerError('Invalid student type found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
