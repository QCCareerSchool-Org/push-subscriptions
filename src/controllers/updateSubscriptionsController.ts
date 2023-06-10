import * as yup from 'yup';

import { updateSubscriptionsInteractor } from '../interactors';
import { UpdateSubscriptionsWebsiteNotFound } from '../interactors/updateSubscriptionsInteractor';
import { BaseController } from './baseController';

type Request = {
  query: {
    websiteName: string;
    endpoint: string;
  };
  body: {
    endpoint: string;
    expirationTime: number | null;
    p256dh: string | null;
    auth: string | null;
  };
};

type Response = { count: number };

export class UpdateSubscriptionsController extends BaseController<Request, Response> {

  protected async validate(): Promise<false | Request> {
    const querySchema: yup.Schema<Request['query']> = yup.object({
      websiteName: yup.string().defined(),
      endpoint: yup.string().defined(),
    });
    const bodySchema: yup.Schema<Request['body']> = yup.object({
      endpoint: yup.string().defined(),
      expirationTime: yup.number().nullable().defined(),
      p256dh: yup.string().nullable().defined(),
      auth: yup.string().nullable().defined(),
    });
    try {
      const [ query, body ] = await Promise.all([
        querySchema.validate(this.req.query),
        bodySchema.validate(this.req.body),
      ]);
      return { query, body };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ query, body }: Request): Promise<void> {
    if (!this.isPutMethod()) {
      return this.methodNotAllowed();
    }

    const result = await updateSubscriptionsInteractor.execute({
      websiteName: query.websiteName,
      oldEndpoint: query.endpoint,
      endpoint: body.endpoint,
      expirationTime: body.expirationTime,
      p256dh: body.p256dh,
      auth: body.auth,
    });

    if (result.success) {
      return this.ok({ count: result.value });
    }

    switch (result.error.constructor) {
      case UpdateSubscriptionsWebsiteNotFound:
        return this.badRequest('Website not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
