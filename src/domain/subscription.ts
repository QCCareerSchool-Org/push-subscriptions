export type SubscriptionDTO = {
  /** uuid */
  subscriptionId: string;
  /** uuid */
  websiteId: string;
  endpoint: string;
  p256dh: string | null;
  auth: string | null;
  firstName: string | null;
  lastName: string | null;
  emailAddress: string | null;
  created: Date;
  modified: Date;
};
