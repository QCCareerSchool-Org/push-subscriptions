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
      }),
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

    const result = await insertSubscriptionInteractor.execute({
      websiteName: body.websiteName,
      endpoint: body.endpoint,
      expirationTime: body.expirationTime,
      p256dh: body.p256dh,
      auth: body.auth,
      meta: body.meta,
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
