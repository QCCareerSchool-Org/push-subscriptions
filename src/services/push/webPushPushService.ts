import webpush from 'web-push';

import type { Action, IPushService } from '.';

type NotificationPayload = {
  tag: string;
  title: string;
  body: string;
  badge?: string;
  icon?: string;
  url?: string;
  image?: string;
  actions?: Action[];
};

export class WebPushPushService implements IPushService {

  public constructor(private readonly emailAddress: string, private readonly privateKey: string, private readonly publicKey: string) { /* empty */ }

  public async push(tag: string, endpoint: string, p256dh: string, auth: string, title: string, body: string, url?: string, image?: string, actions?: Action[]): Promise<number> {
    // webpush.setGCMAPIKey('<Your GCM API Key Here>');
    webpush.setVapidDetails(`mailto:${this.emailAddress}`, this.publicKey, this.privateKey);

    const pushSubscription = {
      endpoint,
      keys: { auth, p256dh },
    };

    const payload: NotificationPayload = { title, body, url: url, image, actions, tag };

    const sendResult = await webpush.sendNotification(pushSubscription, JSON.stringify(payload));

    return sendResult.statusCode;
  }
}
