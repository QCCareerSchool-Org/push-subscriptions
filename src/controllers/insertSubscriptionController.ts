import type { BrowserDetectInfo } from 'browser-detect/dist/types/browser-detect.interface';
import type { CityResponse } from 'maxmind';
import * as yup from 'yup';

import { insertSubscriptionInteractor } from '../interactors';
import type { InsertSubscriptionResponse } from '../interactors/insertSubscriptionInteractor';
import { InsertSubscriptionWebsiteNotFound } from '../interactors/insertSubscriptionInteractor';
import { BaseController } from './baseController';

type Request = {
  body: {
    websiteName: string;
    endpoint: string;
    expirationTime: number | null;
    p256dh: string | null;
    auth: string | null;
    meta?: {
      firstName: string | null;
      lastName: string | null;
      emailAddress: string | null;
      interests?: string[];
    };
  };
};

type Response = InsertSubscriptionResponse;

export class InsertSubscriptionController extends BaseController<Request, Response> {

  protected async validate(): Promise<false | Request> {
    const bodySchema: yup.Schema<Request['body']> = yup.object({
      websiteName: yup.string().defined(),
      endpoint: yup.string().defined(),
      expirationTime: yup.number().nullable().defined(),
      p256dh: yup.string().nullable().defined(),
      auth: yup.string().nullable().defined(),
      meta: yup.object({
        firstName: yup.string().nullable().defined(),
        lastName: yup.string().nullable().defined(),
        emailAddress: yup.string().nullable().defined(),
        interests: yup.array().of(yup.string().required()),
      }).default(undefined),
    });
    try {
      const body = await bodySchema.validate(this.req.body);
      return { body };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ body }: Request): Promise<void> {
    if (!this.isPostMethod()) {
      return this.methodNotAllowed();
    }

    // read browser data from request (created by middleware)
    const browser = this.res.locals.browser as BrowserDetectInfo | undefined;

    // read location data from request (created by middleware)
    const location = this.res.locals.location as CityResponse | undefined;

    // read ip address data from request
    let ipAddress: string | null = null;
    const forwardedFor = this.req.headers['x-forwarded-for'];
    if (Array.isArray(forwardedFor) && forwardedFor.length) {
      ipAddress = forwardedFor[0].split(',')[0].trim();
    } else if (typeof forwardedFor === 'string') {
      ipAddress = forwardedFor.split(',')[0].trim();
    } else if (typeof this.req.socket.remoteAddress === 'string') {
      ipAddress = this.req.socket.remoteAddress;
    }

    const result = await insertSubscriptionInteractor.execute({
      websiteName: body.websiteName,
      endpoint: body.endpoint,
      expirationTime: body.expirationTime,
      p256dh: body.p256dh,
      auth: body.auth,
      meta: body.meta,

      ipAddress,
      userAgent: this.req.headers['user-agent'] ?? null,
      browser: browser?.name ?? null,
      browserVersion: browser?.version ?? null,
      mobile: browser?.mobile ?? null,
      os: browser?.os ?? null,
      city: location?.city?.names.en ?? null,
      country: location?.country?.iso_code ?? null,
      latitude: location?.location?.latitude ?? null,
      longitude: location?.location?.longitude ?? null,
    });

    if (result.success) {
      return this.created(result.value);
    }

    switch (result.error.constructor) {
      case InsertSubscriptionWebsiteNotFound:
        return this.badRequest('Website not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
