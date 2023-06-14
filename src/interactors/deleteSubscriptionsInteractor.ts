import type { PrismaClient } from '@prisma/client';

import type { ILoggerService } from '../services/logger';
import type { ResultType } from './result';
import { Result } from './result';
import type { IInteractor } from '.';

export type DeleteSubscriptionsRequest = {
  websiteName: string;
  endpoint: string;
};

export type DeleteSubscriptionsResponse = number;

export class DeleteSubscriptionsWebsiteNotFound extends Error {}

export class DeleteSubscriptionsInteractor implements IInteractor<DeleteSubscriptionsRequest, DeleteSubscriptionsResponse> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: DeleteSubscriptionsRequest): Promise<ResultType<DeleteSubscriptionsResponse>> {
    try {
      const website = await this.prisma.website.findUnique({ where: { name: request.websiteName } });
      if (!website) {
        return Result.fail(new DeleteSubscriptionsWebsiteNotFound());
      }

      const batchPayload = await this.prisma.subscription.updateMany({
        data: { unsubscribed: true },
        where: { endpoint: request.endpoint, websiteId: website.websiteId },
      });

      const udpatedCount = batchPayload.count;

      return Result.success(udpatedCount);
    } catch (err) {
      this.logger.error('error deleting subscription', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
