import * as yup from 'yup';

import { updateSubscriptionInteractor } from '../../interactors';
import type { UpdateSubscriptionResponse } from '../../interactors/administrators/updateSubscriptionInteractor';
import { UpdateSubscriptionNotFound, UpdateSubscriptionWebsiteNotFound } from '../../interactors/administrators/updateSubscriptionInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    subscriptionId: string;
  };
  body: {
    websiteName: string;
    endpoint: string;
    expirationTime: number | null;
    p256dh: string;
    auth: string;
    firstName: string | null;
    lastName: string | null;
    emailAddress: string | null;
    errorCode: number | null;
    interests?: string[];
  };
};

type Response = UpdateSubscriptionResponse;

export class UpdateSubscriptionController extends BaseController<Request, Response> {

  protected async validate(): Promise<false | Request> {
    const paramsSchema: yup.Schema<Request['params']> = yup.object({
      subscriptionId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(), // uuid
    });
    const bodySchema: yup.Schema<Request['body']> = yup.object({
      websiteName: yup.string().defined(),
      endpoint: yup.string().defined(),
      expirationTime: yup.number().nullable().defined(),
      p256dh: yup.string().defined(),
      auth: yup.string().defined(),
      firstName: yup.string().nullable().defined(),
      lastName: yup.string().nullable().defined(),
      emailAddress: yup.string().nullable().defined(),
      errorCode: yup.number().integer().nullable().defined(),
      interests: yup.array().of(yup.string().required()).optional(),
    });
    try {
      const [ params, body ] = await Promise.all([
        paramsSchema.validate(this.req.params),
        bodySchema.validate(this.req.body),
      ]);
      return { params, body };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ params, body }: Request): Promise<void> {
    if (!this.isPutMethod()) {
      return this.methodNotAllowed();
    }

    const result = await updateSubscriptionInteractor.execute({
      subscriptionId: params.subscriptionId,
      websiteName: body.websiteName,
      endpoint: body.endpoint,
      expirationTime: body.expirationTime,
      p256dh: body.p256dh,
      auth: body.auth,
      firstName: body.firstName,
      lastName: body.lastName,
      emailAddress: body.emailAddress,
      errorCode: body.errorCode,
      interests: body.interests,
    });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case UpdateSubscriptionWebsiteNotFound:
        return this.badRequest('Website not found');
      case UpdateSubscriptionNotFound:
        return this.notFound('Subscription not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
