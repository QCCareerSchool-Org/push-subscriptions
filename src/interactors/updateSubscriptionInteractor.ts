import type { Interest, PrismaClient, Subscription, SubscriptionInterest } from '@prisma/client';

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
  interests?: string[];
};

export type UpdateSubscriptionResponse = SubscriptionDTO;

export class UpdateSubscriptionError extends Error {}
export class UpdateSubscriptionWebsiteNotFound extends UpdateSubscriptionError {}
export class UpdateSubscriptionNotFound extends UpdateSubscriptionError {}

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

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      let updatedSubscription: Subscription & {
        interests: Array<SubscriptionInterest & {
          interest: Interest;
        }>;
      };

      try {
        updatedSubscription = await this.prisma.$transaction(async t => {
          const website = await this.prisma.website.findFirst({ where: { name: request.websiteName } });
          if (!website) {
            throw new UpdateSubscriptionWebsiteNotFound();
          }

          const subscription = await this.prisma.subscription.findUnique({
            where: { subscriptionId: subscriptionIdBin },
            include: { interests: true },
          });
          if (!subscription) {
            throw new UpdateSubscriptionNotFound();
          }

          // set the interests
          if (request.interests) {
            // look up all the interests that we want to add
            const interests = await t.interest.findMany({
              where: {
                websiteId: website.websiteId,
                name: { in: request.interests },
              },
            });

            // see if any aren't found for this website and log a warning
            const notFound = request.interests.filter(name => !interests.some(i => i.name === name));
            if (notFound.length) {
              this.logger.warn('Interests not found', { websiteName: website.name, interests: notFound });
            }

            // delete any exising subscriptionInterests for this subscription that we weren't given
            await t.subscriptionInterest.deleteMany({
              where: { subscriptionId: subscriptionIdBin, interestId: { notIn: interests.map(i => i.interestId) } },
            });

            // determine which ones aren't already present
            const existingInterestIds = subscription.interests.map(i => i.interestId);
            const missingInterestIds = interests.map(i => i.interestId).filter(i => !existingInterestIds.some(e => e.compare(i) === 0));

            // add the missing subscriptionInterests
            await t.subscriptionInterest.createMany({
              data: missingInterestIds.map(interestId => ({
                subscriptionId: subscriptionIdBin,
                interestId,
                created: prismaNow,
              })),
            });
          }

          return t.subscription.update({
            data: {
              websiteId: website.websiteId,
              endpoint: request.endpoint,
              expirationTime: request.expirationTime,
              p256dh: request.p256dh === null ? null : Buffer.from(request.p256dh, 'base64'),
              auth: request.auth === null ? null : Buffer.from(request.auth, 'base64'),
              firstName: request.firstName,
              lastName: request.lastName,
              emailAddress: request.emailAddress,
            },
            where: { subscriptionId: subscriptionIdBin },
            include: { interests: { include: { interest: true } } },
          });
        });
      } catch (err) {
        if (err instanceof UpdateSubscriptionError) {
          return Result.fail(err);
        }
        throw err;
      }

      return Result.success({
        subscriptionId: this.uuidService.binToUUID(updatedSubscription.subscriptionId),
        websiteId: this.uuidService.binToUUID(updatedSubscription.websiteId),
        endpoint: updatedSubscription.endpoint,
        expirationTime: updatedSubscription.expirationTime,
        p256dh: updatedSubscription.p256dh === null ? null : updatedSubscription.p256dh.toString('base64'),
        auth: updatedSubscription.auth === null ? null : updatedSubscription.auth.toString('base64'),
        firstName: updatedSubscription.firstName,
        lastName: updatedSubscription.lastName,
        emailAddress: updatedSubscription.emailAddress,
        errorCode: updatedSubscription.errorCode,
        created: this.dateService.fixPrismaReadDate(updatedSubscription.created),
        modified: this.dateService.fixPrismaReadDate(updatedSubscription.modified),
        interests: updatedSubscription.interests.map(i => i.interest.name),
      });
    } catch (err) {
      this.logger.error('error updating subscriptions', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
