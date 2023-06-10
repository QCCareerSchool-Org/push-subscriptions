import { Router } from 'express';

import { DeleteSubscriptionsController } from '../../controllers/deleteSubscriptionsController';
import { InsertSubscriptionController } from '../../controllers/insertSubscriptionController';
import { UpdateSubscriptionController } from '../../controllers/updateSubscriptionController';
import { UpdateSubscriptionsController } from '../../controllers/updateSubscriptionsController';
import type { Route } from './applyRoutes';
import { applyRoutes } from './applyRoutes';

export const router = Router();

const routes: Route[] = [
  [ 'post', '/subscriptions', InsertSubscriptionController ],
  [ 'put', '/subscriptions', UpdateSubscriptionsController ],
  [ 'delete', '/subscriptions', DeleteSubscriptionsController ],
  [ 'put', '/subscriptions/:subscriptionId', UpdateSubscriptionController ],
];

applyRoutes(router, routes);
