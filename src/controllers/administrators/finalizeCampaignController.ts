import * as yup from 'yup';

import { finalizeCampaignInteractor } from '../../interactors/administrators';
import type { FinalizeCampaignResponse } from '../../interactors/administrators/finalizeCampaignInteractor';
import { FinalizeCampaignAlreadyFinalized, FinalizeCampaignNotFound } from '../../interactors/administrators/finalizeCampaignInteractor';
import { BaseController } from '../baseController';

type Request = {
  params: {
    campaignId: string;
  };
};

type Response = { count: number };

export class FinalizeCampaignController extends BaseController<Request, Response> {

  protected async validate(): Promise<false | Request> {
    const paramsSchema: yup.Schema<Request['params']> = yup.object({
      campaignId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(), // uuid
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

    const result = await finalizeCampaignInteractor.execute({ campaignId: params.campaignId });

    if (result.success) {
      return this.ok({ count: result.value });
    }

    switch (result.error.constructor) {
      case FinalizeCampaignNotFound:
        return this.notFound('Campaign not found');
      case FinalizeCampaignAlreadyFinalized:
        return this.badRequest('Campaign already finalized');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
