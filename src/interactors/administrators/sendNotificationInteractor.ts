import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

import type { IInteractor } from '..';
import type { IDateService } from '../../services/date';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';

export type SendNotificationRequest = {
  notificationId: string;
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
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: SendNotificationRequest): Promise<ResultType<SendNotificationResponse>> {
    try {
      const campaignIdBin = this.uuidService.uuidToBin(request.campaignId);

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      let insertedCount: number;

      try {
        insertedCount = await this.prisma.$transaction(async t => {
          const campaign = await t.campaign.findUnique({
            where: { campaignId: campaignIdBin },
            include: { interests: true },
          });
          if (!campaign) {
            throw new SendNotificationNotFound();
          }

          if (campaign.finalized !== null) {
            throw new SendNotificationAlreadyFinalized();
          }

          await t.campaign.update({
            data: { finalized: prismaNow },
            where: { campaignId: campaignIdBin },
          });

          // this takes about 1/5 the time as calling findMany and then calling createMany
          if (campaign.interests.length) {
            await t.$queryRaw`
INSERT INTO sends
SELECT DISTINCT ci.campaign_id, s.subscription_id, ci.website_id, null, null, null, NOW(6)
FROM subscriptions s
JOIN subscriptions_interests si ON si.subscription_id = s.subscription_id
JOIN campaigns_interests ci ON ci.interest_id = si.interest_id
WHERE ci.campaign_id = ${campaignIdBin} AND s.unsubscribed = 0 AND s.error_code IS NULL`;
          } else {
            await t.$queryRaw`
INSERT INTO sends
SELECT c.campaign_id, s.subscription_id, c.website_id, null, null, null, NOW(6)
FROM subscriptions s
JOIN campaigns c ON c.website_id = s.website_id
WHERE c.campaign_id = ${campaignIdBin} AND s.unsubscribed = 0 AND s.error_code IS NULL`;
          }

          const aggregate = await t.send.aggregate({
            _count: { _all: true },
            where: { campaignId: campaignIdBin },
          });

          const count = aggregate._count._all;

          if (count === 0) {
            throw new SendNotificationNoMatchingSubscriptions();
          }

          return count;
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

      return Result.success(insertedCount);
    } catch (err) {
      this.logger.error('error finalizing campaign', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
