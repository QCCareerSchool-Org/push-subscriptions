import { prisma } from '../../frameworks/prisma';
import { dateService, uuidService, winstonLoggerService } from '../../services';
import { FinalizeCampaignInteractor } from './finalizeCampaignInteractor';

export const finalizeCampaignInteractor = new FinalizeCampaignInteractor(prisma, uuidService, dateService, winstonLoggerService);
