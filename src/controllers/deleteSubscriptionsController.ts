import * as yup from 'yup';

import { deleteSubscriptionsInteractor } from '../interactors';
import { DeleteSubscriptionsWebsiteNotFound } from '../interactors/deleteSubscriptionsInteractor';
import { BaseController } from './baseController';

type Request = {
  query: {
    websiteName: string;
    endpoint: string;
  };
};

type Response = { count: number };

export class DeleteSubscriptionsController extends BaseController<Request, Response> {

  protected async validate(): Promise<false | Request> {
    const querySchema: yup.Schema<Request['query']> = yup.object({
      websiteName: yup.string().defined(),
      endpoint: yup.string().defined(),
    });
    try {
      const query = await querySchema.validate(this.req.query);
      return { query };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ query }: Request): Promise<void> {
    if (!this.isDeleteMethod()) {
      return this.methodNotAllowed();
    }

    const result = await deleteSubscriptionsInteractor.execute({
      websiteName: query.websiteName,
      endpoint: query.endpoint,
    });

    if (result.success) {
      return this.ok({ count: result.value });
    }

    switch (result.error.constructor) {
      case DeleteSubscriptionsWebsiteNotFound:
        return this.badRequest('Website not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
