import type { PrismaClient } from '@prisma/client';

import type { SubscriptionDTO } from '../domain/subscription';
import type { IDateService } from '../services/date';
import type { ILoggerService } from '../services/logger';
import type { IUUIDService } from '../services/uuid';
import type { ResultType } from './result';
import { Result } from './result';
import type { IInteractor } from '.';

export type UpdateSubscriptionRequest = {
  /** UUID */
  subscriptionId: string;
  websiteName: string;
  endpoint: string;
  /** base64 */
  auth: string | null;
  /** base64 */
  p256dh: string | null;
  /** DOMHighResTimeStamp */
  expirationTime: number | null;
  firstName: string | null;
  lastName: string | null;
  emailAddress: string | null;
  errorCode: number | null;
};

export type UpdateSubscriptionResponse = SubscriptionDTO;

export class UpdateSubscriptionWebsiteNotFound extends Error {}
export class UpdateSubscriptionNotFound extends Error {}

export class UpdateSubscriptionInteractor implements IInteractor<UpdateSubscriptionRequest, UpdateSubscriptionResponse> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: UpdateSubscriptionRequest): Promise<ResultType<UpdateSubscriptionResponse>> {
    try {
      const subscriptionIdBin = this.uuidService.uuidToBin(request.subscriptionId);

      const website = await this.prisma.websites.findFirst({ where: { name: request.websiteName } });
      if (!website) {
        return Result.fail(new UpdateSubscriptionWebsiteNotFound());
      }

      const subscription = await this.prisma.subscription.findUnique({ where: { subscriptionId: subscriptionIdBin } });
      if (!subscription) {
        return Result.fail(new UpdateSubscriptionNotFound());
      }

      const updatedSubscription = await this.prisma.subscription.update({
        data: {

        },
        where: { subscriptionId: subscriptionIdBin },
      });

      return Result.success({
        subscriptionId: this.uuidService.binToUUID(updatedSubscription.subscriptionId),
        websiteId: this.uuidService.binToUUID(updatedSubscription.websiteId),
        endpoint: updatedSubscription.endpoint,
        p256dh: updatedSubscription.p256dh === null ? null : updatedSubscription.p256dh.toString('base64'),
        auth: updatedSubscription.auth === null ? null : updatedSubscription.auth.toString('base64'),
        firstName: updatedSubscription.firstName,
        lastName: updatedSubscription.lastName,
        emailAddress: updatedSubscription.emailAddress,
        errorCode: updatedSubscription.errorCode,
        created: this.dateService.fixPrismaReadDate(updatedSubscription.created),
        modified: this.dateService.fixPrismaReadDate(updatedSubscription.modified),
      });
    } catch (err) {
      this.logger.error('error updating subscriptions', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
