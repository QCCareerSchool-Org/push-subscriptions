import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

import type { IInteractor } from '..';
import type { IDateService } from '../../services/date';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';

export type FinalizeCampaignRequest = {
  campaignId: string;
};

export type FinalizeCampaignResponse = number;

export class FinalizeCampaignError extends Error { }
export class FinalizeCampaignNotFound extends FinalizeCampaignError { }
export class FinalizeCampaignAlreadyFinalized extends FinalizeCampaignError { }
export class FinalizeCampaignNoMatchingSubscriptions extends FinalizeCampaignError { }

export class FinalizeCampaignInteractor implements IInteractor<FinalizeCampaignRequest, FinalizeCampaignResponse> {

  public static transactionTimeout = 30_000; // 30 seconds

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: FinalizeCampaignRequest): Promise<ResultType<FinalizeCampaignResponse>> {
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
            throw new FinalizeCampaignNotFound();
          }

          if (campaign.finalized !== null) {
            throw new FinalizeCampaignAlreadyFinalized();
          }

          await t.campaign.update({
            data: { finalized: prismaNow },
            where: { campaignId: campaignIdBin },
          });

          // this takes about 1/5 the time as calling findMany and then calling createMany
          if (campaign.interests.length) {
            await t.$queryRaw`
INSERT INTO sends
SELECT DISTINCT ${campaignIdBin}, s.subscription_id, ${campaign.websiteId}, null, null, null, NOW()
FROM subscriptions s
JOIN subscriptions_interests si USING(subscription_id)
WHERE s.website_id = ${campaign.websiteId} AND si.interest_id IN (${campaign.interests.map(i => `0x${i.interestId.toString()}`).join()})`;
          } else {
            await t.$queryRaw`
INSERT INTO sends
SELECT ${campaignIdBin}, s.subscription_id, ${campaign.websiteId}, null, null, null, NOW()
FROM subscriptions s
WHERE website_id = ${campaign.websiteId}`;
          }

          const aggregate = await t.send.aggregate({
            _count: { _all: true },
            where: { campaignId: campaignIdBin },
          });

          const count = aggregate._count._all;

          if (count === 0) {
            throw new FinalizeCampaignNoMatchingSubscriptions();
          }

          return count;
        }, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: FinalizeCampaignInteractor.transactionTimeout,
        });
      } catch (err) {
        if (err instanceof FinalizeCampaignError) {
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
