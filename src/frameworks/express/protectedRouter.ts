import { Router } from 'express';

import { UpdateSubscriptionController } from '../../controllers/updateSubscriptionController';
import type { Route } from './applyRoutes';
import { applyRoutes } from './applyRoutes';

export const protectedRouter = Router();

const routes: Route[] = [
  [ 'put', '/subscriptions/:subscriptionId', UpdateSubscriptionController ],
];

applyRoutes(protectedRouter, routes);
