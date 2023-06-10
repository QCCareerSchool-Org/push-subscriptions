import type { PrismaClient, Subscription } from '@prisma/client';

import type { SubscriptionDTO } from '../domain/subscription';
import type { IDateService } from '../services/date';
import type { ILoggerService } from '../services/logger';
import type { IUUIDService } from '../services/uuid';
import type { ResultType } from './result';
import { Result } from './result';
import type { IInteractor } from '.';

export type InsertSubscriptionRequest = {
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
};

export type InsertSubscriptionResponse = SubscriptionDTO;

export class InsertSubscriptionWebsiteNotFound extends Error {}

export class InsertSubscriptionInteractor implements IInteractor<InsertSubscriptionRequest, InsertSubscriptionResponse> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: InsertSubscriptionRequest): Promise<ResultType<InsertSubscriptionResponse>> {
    try {
      const website = await this.prisma.websites.findFirst({ where: { name: request.websiteName } });
      if (!website) {
        return Result.fail(new InsertSubscriptionWebsiteNotFound());
      }

      const existingSubscription = await this.prisma.subscription.findFirst({
        where: { endpoint: request.endpoint, websiteId: website.websiteId },
      });

      const data: Record<string, unknown> = {
        expirationTime: request.expirationTime,
        auth: request.auth === null ? null : Buffer.from(request.auth, 'base64'),
        p256dh: request.p256dh === null ? null : Buffer.from(request.p256dh, 'base64'),
      };

      if (request.firstName !== null) {
        data.firstName = request.firstName || null;
      }
      if (request.lastName !== null) {
        data.lastName = request.lastName || null;
      }
      if (request.emailAddress !== null) {
        data.emailAddress = request.emailAddress || null;
      }

      let subscription: Subscription;

      if (existingSubscription) {
        subscription = await this.prisma.subscription.update({
          data,
          where: { subscriptionId: existingSubscription.subscriptionId },
        });
      } else {
        const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());
        subscription = await this.prisma.subscription.create({
          data: {
            ...data,
            subscriptionId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
            websiteId: website.websiteId,
            endpoint: request.endpoint,
            created: prismaNow,
            modified: prismaNow,
          },
        });
      }

      return Result.success({
        subscriptionId: this.uuidService.binToUUID(subscription.subscriptionId),
        websiteId: this.uuidService.binToUUID(subscription.websiteId),
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh === null ? null : subscription.p256dh.toString('base64'),
        auth: subscription.auth === null ? null : subscription.auth.toString('base64'),
        firstName: subscription.firstName,
        lastName: subscription.lastName,
        emailAddress: subscription.emailAddress,
        errorCode: subscription.errorCode,
        created: this.dateService.fixPrismaReadDate(subscription.created),
        modified: this.dateService.fixPrismaReadDate(subscription.modified),
      });
    } catch (err) {
      this.logger.error('error inserting subscription', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
