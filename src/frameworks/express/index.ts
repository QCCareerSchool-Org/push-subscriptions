import compression from 'compression';
import type { CorsOptions } from 'cors';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { NotFoundController } from '../../controllers/notFoundController';
import { environmentConfigService, winstonLoggerService } from '../../services';
import { asyncWrapper } from './asyncWrapper';
import { globalErrorHandler } from './globalErrorHandler';
import { router } from './router';

const { port, environment } = environmentConfigService.config;

const validOrigins = [
  /^https:\/\/(?:.+\.)?qcpetstudies\.com$/ui,
  /^https:\/\/(?:.+\.)?qcmakeupacademy\.com$/ui,
  /^https:\/\/(?:.+\.)?qcdesignschool\.com$/ui,
  /^https:\/\/(?:.+\.)?qceventplanning\.com$/ui,
  /^https:\/\/(?:.+\.)?qcwellnessstudies\.com$/ui,
  /^https:\/\/(?:.+\.)?winghill\.com$/ui,
  /^https:\/\/(?:.+\.)?qccareerschool\.com$/ui,
];

const corsOptions: CorsOptions = {
  origin: environment === 'production' ? validOrigins : '*',
};

const app = express();

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: 524_288 })); // 512 KB
app.use(cors(corsOptions));

app.use('/', router);

// all other routes return 404
app.use(asyncWrapper(async (req, res) => {
  const controller = new NotFoundController(req, res);
  await controller.execute();
}));

app.use(globalErrorHandler);

app.listen(port, () => {
  winstonLoggerService.info(`started on port ${port}`);
});
