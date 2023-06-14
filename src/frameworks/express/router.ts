import { Router } from 'express';

import { CreateSubscriptionController } from '../../controllers/createSubscriptionController';
import { DeleteSubscriptionsController } from '../../controllers/deleteSubscriptionsController';
import { UpdateSubscriptionsController } from '../../controllers/updateSubscriptionsController';
import type { Route } from './applyRoutes';
import { applyRoutes } from './applyRoutes';
import { browserDetectMiddleware } from './browserDetectMiddleware';
import { locationMiddleware } from './locationMiddleware';

export const router = Router();

const routes: Route[] = [
  [ 'post', '/subscriptions', CreateSubscriptionController, locationMiddleware, browserDetectMiddleware ],
  [ 'put', '/subscriptions', UpdateSubscriptionsController ],
  [ 'delete', '/subscriptions', DeleteSubscriptionsController ],
];

applyRoutes(router, routes);
