import { Router } from 'express';

import { LoginController } from '../../controllers/authentication/loginController';
import { LogoutController } from '../../controllers/authentication/logoutController';
import { RefreshController } from '../../controllers/authentication/refreshController';
import type { Route } from './applyRoutes';
import { applyRoutes } from './applyRoutes';
import { browserDetectMiddleware } from './browserDetectMiddleware';
import { locationMiddleware } from './locationMiddleware';

export const authenticationRouter = Router();

const routes: Route[] = [
  // logging in
  [ 'post', '/login', LoginController, locationMiddleware, browserDetectMiddleware ],
  // logging out
  [ 'post', '/logout', LogoutController ],
  // refreshing an authorization token
  [ 'post', '/refresh', RefreshController ],
];

applyRoutes(authenticationRouter, routes);
