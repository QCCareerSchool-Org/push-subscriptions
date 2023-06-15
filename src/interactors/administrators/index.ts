import { prisma } from '../../frameworks/prisma';
import { dateService, uuidService, webPushPushService, winstonLoggerService } from '../../services';
import { FinalizeCampaignInteractor } from './finalizeCampaignInteractor';
import { SendNotificationInteractor } from './sendNotificationInteractor';

export const finalizeCampaignInteractor = new FinalizeCampaignInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const sendNotificationInteractor = new SendNotificationInteractor(prisma, uuidService, dateService, webPushPushService, winstonLoggerService);
