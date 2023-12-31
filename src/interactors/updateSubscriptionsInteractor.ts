import type { PrismaClient } from '@prisma/client';

import type { ILoggerService } from '../services/logger';
import type { ResultType } from './result';
import { Result } from './result';
import type { IInteractor } from '.';

export type UpdateSubscriptionsRequest = {
  websiteName: string;
  oldEndpoint: string;
  endpoint: string;
  /** base64 */
  auth: string;
  /** base64 */
  p256dh: string;
  /** DOMHighResTimeStamp */
  expirationTime: number | null;
};

export type UpdateSubscriptionsResponse = number;

export class UpdateSubscriptionsWebsiteNotFound extends Error {}

export class UpdateSubscriptionsInteractor implements IInteractor<UpdateSubscriptionsRequest, UpdateSubscriptionsResponse> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: UpdateSubscriptionsRequest): Promise<ResultType<UpdateSubscriptionsResponse>> {
    try {
      const website = await this.prisma.website.findUnique({ where: { name: request.websiteName } });
      if (!website) {
        return Result.fail(new UpdateSubscriptionsWebsiteNotFound());
      }

      const data = {
        endpoint: request.endpoint,
        expirationTime: request.expirationTime,
        auth: Buffer.from(request.auth, 'base64'),
        p256dh: Buffer.from(request.p256dh, 'base64'),
      };

      const batchPayload = await this.prisma.subscription.updateMany({
        data,
        where: { endpoint: request.oldEndpoint, websiteId: website.websiteId, errorCode: null, unsubscribed: false },
      });

      const updatedCount = batchPayload.count;

      return Result.success(updatedCount);
    } catch (err) {
      this.logger.error('error updating subscriptions', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
