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
export class SendNotificationRemoteServerError extends SendNotificationError {
  public constructor(public readonly responseCode: number, message?: string) { super(message); }
}

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

      let sendSuccess: boolean;

      try {
        sendSuccess = await this.prisma.$transaction(async t => {
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
          const p256dh = subscription.p256dh.toString('base64');
          const auth = subscription.auth.toString('base64');
          const responseCode = await this.pushService.push(subscription.endpoint, p256dh, auth, campaign.heading, campaign.content, campaign.url, 'https://i0.wp.com/blog.meme.com/wp-content/uploads/hidethepainharold.jpeg?fit=1200%2C675&ssl=1');

          if (responseCode >= 500) {
            throw new SendNotificationRemoteServerError(responseCode);
          }

          const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

          await t.notification.update({
            data: { sent: prismaNow, responseCode },
            where: { campaignSubscription: { campaignId: campaignIdBin, subscriptionId: subscriptionIdBin } },
          });

          const success = !(responseCode >= 400);

          if (!success) {
            await t.subscription.update({
              data: { errorCode: responseCode },
              where: { subscriptionId: subscriptionIdBin },
            });
          }

          return success;
        }, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: SendNotificationInteractor.transactionTimeout,
        });
      } catch (err) {
        if (err instanceof SendNotificationError) {
          return Result.fail(err);
        }
        throw err;
      }

      return Result.success(sendSuccess);
    } catch (err) {
      this.logger.error('error sending notification', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
