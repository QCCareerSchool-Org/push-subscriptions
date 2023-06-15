import * as yup from 'yup';

import { sendNotificationInteractor } from '../../interactors/administrators';
import type { SendNotificationResponse } from '../../interactors/administrators/sendNotificationInteractor';
import { SendNotificationAlreadySent, SendNotificationNotFound } from '../../interactors/administrators/sendNotificationInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    campaignId: string;
    subscriptionId: string;
  };
};

type Response = { success: SendNotificationResponse };

export class SendNotificationController extends BaseController<Request, Response> {

  protected async validate(): Promise<false | Request> {
    const paramsSchema: yup.Schema<Request['params']> = yup.object({
      campaignId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(), // uuid
      subscriptionId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(), // uuid
    });
    try {
      const params = await paramsSchema.validate(this.req.params);
      return { params };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ params }: Request): Promise<void> {
    if (!this.isPostMethod()) {
      return this.methodNotAllowed();
    }

    const result = await sendNotificationInteractor.execute({ campaignId: params.campaignId, subscriptionId: params.subscriptionId });

    if (result.success) {
      return this.ok({ success: result.value });
    }

    switch (result.error.constructor) {
      case SendNotificationNotFound:
        return this.notFound('Notification not found');
      case SendNotificationAlreadySent:
        return this.badRequest('Notification already sent');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
