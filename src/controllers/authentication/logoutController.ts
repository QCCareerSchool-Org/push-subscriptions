import * as yup from 'yup';

import { logoutInteractor } from '../../interactors/authentication/index';
import { LogoutTokenInvalid, LogoutTokenNotFound } from '../../interactors/authentication/logoutInteractor';
import { environmentConfigService } from '../../services/index';
import { BaseController } from '../baseController';

type Request = {
  cookies: {
    refreshTokenId?: string;
    refreshToken?: string;
  };
};

export class LogoutController extends BaseController<Request, void> {

  protected async validate(): Promise<Request | false> {
    const cookiesSchema: yup.Schema<Request['cookies']> = yup.object({
      refreshTokenId: yup.string(),
      refreshToken: yup.string(),
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

    const result = await logoutInteractor.execute({ id: cookies.refreshTokenId, token: cookies.refreshToken });

    this.clearCookies();

    if (result.success) {
      return this.noContent();
    }

    switch (result.error.constructor) {
      case LogoutTokenNotFound:
      case LogoutTokenInvalid:
        return this.noContent(); // log out anyway
      default:
        return this.internalServerError(result.error.message);
    }
  }

  /**
   * Clear all authorization cookies
   */
  private clearCookies(): void {
    const secure = environmentConfigService.config.environment !== 'development';
    const sameSite = 'strict';
    const httpOnly = true;
    const domain = environmentConfigService.config.auth.cookieDomain;
    this.res.clearCookie('refeshToken', { secure, sameSite, httpOnly, domain });
    this.res.clearCookie('refreshId', { secure, sameSite, httpOnly, domain });
    this.res.clearCookie('accessToken', { secure, sameSite, httpOnly, domain });
    this.res.clearCookie('XSRF-TOKEN', { secure, sameSite, httpOnly, domain });
  }
}
