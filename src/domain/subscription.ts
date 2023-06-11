export type SubscriptionDTO = {
  /** uuid */
  subscriptionId: string;
  /** uuid */
  websiteId: string;
  endpoint: string;
  expirationTime: number | null;
  p256dh: string | null;
  auth: string | null;
  firstName: string | null;
  lastName: string | null;
  emailAddress: string | null;
  errorCode: number | null;
  created: Date;
  modified: Date;
  interests: string[];
};
