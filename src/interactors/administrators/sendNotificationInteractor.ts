import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

import type { IInteractor } from '..';
import type { IDateService } from '../../services/date';
import type { ILoggerService } from '../../services/logger';
import type { IPushService } from '../../services/push';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';

export type SendNotificationRequest = {
  campaignId: string;
  subscriptionId: string;
};

export type SendNotificationResponse = boolean;

export class SendNotificationError extends Error { }
export class SendNotificationNotFound extends SendNotificationError { }
export class SendNotificationAlreadySent extends SendNotificationError { }

export class SendNotificationInteractor implements IInteractor<SendNotificationRequest, SendNotificationResponse> {

  public static transactionTimeout = 30_000; // 30 seconds

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly pushService: IPushService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: SendNotificationRequest): Promise<ResultType<SendNotificationResponse>> {
    try {
      const campaignIdBin = this.uuidService.uuidToBin(request.campaignId);
      const subscriptionIdBin = this.uuidService.uuidToBin(request.subscriptionId);

      let success: boolean;

      try {
        success = await this.prisma.$transaction(async t => {
          const notification = await t.notification.findUnique({
            where: { campaignSubscription: { campaignId: campaignIdBin, subscriptionId: subscriptionIdBin } },
            include: { campaign: true, subscription: true },
          });
          if (!notification) {
            throw new SendNotificationNotFound();
          }

          if (notification.sent !== null) {
            throw new SendNotificationAlreadySent();
          }

          const { subscription, campaign } = notification;
          const result = await this.send(subscription.endpoint, subscription.p256dh, subscription.auth, campaign.heading, campaign.content, campaign.url);

          const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

          await t.notification.update({
            data: { sent: prismaNow },
            where: { campaignSubscription: { campaignId: campaignIdBin, subscriptionId: subscriptionIdBin } },
          });

          return result;
        }, {
          isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
          timeout: SendNotificationInteractor.transactionTimeout,
        });
      } catch (err) {
        if (err instanceof SendNotificationError) {
          return Result.fail(err);
        }
        throw err;
      }

      return Result.success(success);
    } catch (err) {
      this.logger.error('error sending notification', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async send(endpoint: string, p256dh: Buffer | null, auth: Buffer | null, heading: string, content: string, url: string | null): Promise<boolean> {
    const httpResponse = await this.pushService.push(endpoint, p256dh, auth, heading, content, url);
    if (httpResponse >= 400) {
      return false;
    }
    return true;
  }
}
