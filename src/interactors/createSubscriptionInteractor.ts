import type { Interest, PrismaClient, Subscription, SubscriptionInterest } from '@prisma/client';

import type { SubscriptionDTO } from '../domain/subscription';
import type { IDateService } from '../services/date';
import type { IIPAddressService } from '../services/ipaddress';
import type { ILoggerService } from '../services/logger';
import type { IUUIDService } from '../services/uuid';
import type { ResultType } from './result';
import { Result } from './result';
import type { IInteractor } from '.';

export type CreateSubscriptionRequest = {
  websiteName: string;
  endpoint: string;
  /** base64 */
  auth: string;
  /** base64 */
  p256dh: string;
  /** DOMHighResTimeStamp */
  expirationTime: number | null;
  meta?: {
    firstName: string | null;
    lastName: string | null;
    emailAddress: string | null;
    interests?: string[];
  };
  ipAddress: string | null;
  userAgent: string | null;
  browser: string | null;
  browserVersion: string | null;
  mobile: boolean | null;
  os: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
};

type Payload = {
  expirationTime: number | null;
  auth: Buffer;
  p256dh: Buffer;
  firstName: string | null;
  lastName: string | null;
  emailAddress: string | null;
  ipAddress: Buffer | null;
  userAgent: string | null;
  browser: string | null;
  browserVersion: string | null;
  mobile: boolean | null;
  os: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type CreateSubscriptionResponse = SubscriptionDTO;

export class CreateSubscriptionError extends Error { }
export class CreateSubscriptionWebsiteNotFound extends CreateSubscriptionError { }

export class CreateSubscriptionInteractor implements IInteractor<CreateSubscriptionRequest, CreateSubscriptionResponse> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly ipAddressService: IIPAddressService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: CreateSubscriptionRequest): Promise<ResultType<CreateSubscriptionResponse>> {
    try {
      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      const data: Partial<Payload> = {
        expirationTime: request.expirationTime,
        auth: Buffer.from(request.auth, 'base64'),
        p256dh: Buffer.from(request.p256dh, 'base64'),
      };

      if (request.meta) {
        if (request.meta.firstName) {
          data.firstName = request.meta.firstName;
        }
        if (request.meta.lastName) {
          data.lastName = request.meta.lastName;
        }
        if (request.meta.emailAddress) {
          data.emailAddress = request.meta.emailAddress;
        }
      }

      if (request.ipAddress) {
        data.ipAddress = this.ipAddressService.parse(request.ipAddress);
      }
      if (request.userAgent) {
        data.userAgent = request.userAgent;
      }
      if (request.browser) {
        data.browser = request.browser;
      }
      if (request.browserVersion) {
        data.browserVersion = request.browserVersion;
      }
      if (request.mobile !== null) {
        data.mobile = request.mobile;
      }
      if (request.os) {
        data.os = request.os;
      }
      if (request.city) {
        data.city = request.city;
      }
      if (request.country) {
        data.country = request.country;
      }
      if (request.latitude) {
        data.latitude = request.latitude;
      }
      if (request.longitude) {
        data.longitude = request.longitude;
      }

      let subscription: Subscription & {
        interests: Array<SubscriptionInterest & {
          interest: Interest;
        }>;
      };

      try {
        subscription = await this.prisma.$transaction(async t => {
          const website = await t.website.findUnique({ where: { name: request.websiteName } });
          if (!website) {
            throw new CreateSubscriptionWebsiteNotFound();
          }

          const existingSubscription = await t.subscription.findFirst({
            where: { endpoint: request.endpoint, websiteId: website.websiteId, errorCode: null, unsubscribed: false },
            include: { interests: true },
          });

          let subscriptionId: Buffer;
          let existingInterestIds: Buffer[];

          if (existingSubscription) {
            subscriptionId = existingSubscription.subscriptionId;
            existingInterestIds = existingSubscription.interests.map(i => i.interestId);

            await t.subscription.update({
              data,
              where: { subscriptionId: existingSubscription.subscriptionId },
            });
          } else {
            const newSubscription = await t.subscription.create({
              data: {
                ...data as Payload,
                subscriptionId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                websiteId: website.websiteId,
                endpoint: request.endpoint,
                created: prismaNow,
                modified: prismaNow,
              },
            });

            subscriptionId = newSubscription.subscriptionId;
            existingInterestIds = [];
          }

          console.log('interests', request.meta?.interests);

          // add any interests that aren't already present
          if (request.meta?.interests) {
            // look up all the interests that we want to add
            const interests = await t.interest.findMany({
              where: {
                websiteId: website.websiteId,
                name: { in: request.meta?.interests },
              },
            });

            // see if any aren't found for this website and log a warning
            const notFound = request.meta?.interests.filter(name => !interests.some(i => i.name === name));
            if (notFound.length) {
              this.logger.warn('Interests not found', { websiteName: website.name, interests: notFound });
            }

            // determine which ones aren't already present
            const interestIds = interests.map(i => i.interestId);
            const missingInterestIds = interestIds.filter(i => !existingInterestIds.some(e => e.compare(i) === 0));

            console.log('interestIds', interestIds);
            console.log('missingInterestIds', missingInterestIds);

            // add the missing subscriptionInterests
            await t.subscriptionInterest.createMany({
              data: missingInterestIds.map(interestId => ({
                subscriptionId,
                websiteId: website.websiteId,
                interestId,
                created: prismaNow,
              })),
            });
          }

          return t.subscription.findUniqueOrThrow({
            where: { subscriptionId },
            include: { interests: { include: { interest: true } } },
          });
        });
      } catch (err) {
        if (err instanceof CreateSubscriptionError) {
          return Result.fail(err);
        }
        throw err;
      }

      return Result.success({
        subscriptionId: this.uuidService.binToUUID(subscription.subscriptionId),
        websiteId: this.uuidService.binToUUID(subscription.websiteId),
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime,
        p256dh: subscription.p256dh === null ? null : subscription.p256dh.toString('base64'),
        auth: subscription.auth === null ? null : subscription.auth.toString('base64'),
        firstName: subscription.firstName,
        lastName: subscription.lastName,
        emailAddress: subscription.emailAddress,
        errorCode: subscription.errorCode,
        created: this.dateService.fixPrismaReadDate(subscription.created),
        modified: this.dateService.fixPrismaReadDate(subscription.modified),
        interests: subscription.interests.map(i => i.interest.name),
      });
    } catch (err) {
      this.logger.error('error inserting subscription', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
