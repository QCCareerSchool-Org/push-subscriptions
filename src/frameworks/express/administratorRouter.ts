import { Router } from 'express';

import { FinalizeCampaignController } from '../../controllers/administrators/finalizeCampaignController';
import { SendNotificationController } from '../../controllers/administrators/sendNotificationController';
import { UpdateSubscriptionController } from '../../controllers/administrators/updateSubscriptionController';
import type { Route } from './applyRoutes';
import { applyRoutes } from './applyRoutes';

export const adminRouter = Router();

const routes: Route[] = [
  [ 'put', '/subscriptions/:subscriptionId', UpdateSubscriptionController ],
  // [ 'get', '/campaigns', GetAllCampaignsController ],
  // [ 'post', '/campaigns', CreateCampaignController ],
  // [ 'get', '/campaigns/:campaignId', GetCampaignController ],
  // [ 'put', '/campaigns/:campaignId', UpdateCampaignController ],
  [ 'post', '/campaigns/:campaignId/finalizations', FinalizeCampaignController ],
  // [ 'get', '/campaigns/:campaignId/subscriptions', GetAllNotificationsController ],
  [ 'post', '/campaigns/:campaignId/subscriptions/:subscriptionId', SendNotificationController ],
];

applyRoutes(adminRouter, routes);
