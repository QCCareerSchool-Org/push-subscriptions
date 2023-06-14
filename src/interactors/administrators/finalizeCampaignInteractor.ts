import type { Prisma, PrismaClient } from '@prisma/client';

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

export class FinalizeCampaignInteractor implements IInteractor<FinalizeCampaignRequest, FinalizeCampaignResponse> {

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

      let batchPayload: Prisma.BatchPayload;

      try {
        batchPayload = await this.prisma.$transaction(async t => {
          const campaign = await this.prisma.campaign.findUnique({ where: { campaignId: campaignIdBin } });
          if (!campaign) {
            throw new FinalizeCampaignNotFound();
          }

          if (campaign.finalized !== null) {
            throw new FinalizeCampaignAlreadyFinalized();
          }

          await this.prisma.campaign.update({
            data: { finalized: prismaNow },
            where: { campaignId: campaignIdBin },
          });

          const subscriptions = await this.prisma.subscription.findMany({
            where: { websiteId: campaign.websiteId },
          });

          const baseData = {
            campaignId: campaignIdBin,
            websiteId: campaign.websiteId,
            created: prismaNow,
          } as const;

          return this.prisma.send.createMany({
            data: subscriptions.map(s => ({
              ...baseData,
              subscriptionId: s.subscriptionId,
              created: prismaNow,
            })),
          });
        });
      } catch (err) {
        if (err instanceof FinalizeCampaignError) {
          return Result.fail(err);
        }
        throw err;
      }

      const udpatedCount = batchPayload.count;

      return Result.success(udpatedCount);
    } catch (err) {
      this.logger.error('error finalizing campaign', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
