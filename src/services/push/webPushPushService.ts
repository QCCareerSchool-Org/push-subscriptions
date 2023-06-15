import webpush from 'web-push';

import type { Action, IPushService } from '.';

type NotificationPayload = {
  title?: string;
  body?: string;
  badge?: string;
  icon?: string;
  url?: string;
  image?: string;
  actions?: Action[];
  vibrate?: number[];
};

export class WebPushPushService implements IPushService {

  public constructor(private readonly emailAddress: string, private readonly privateKey: string, private readonly publicKey: string) { /* empty */ }

  public async push(endpoint: string, p256dh: string, auth: string, title: string, body: string, url?: string, image?: string, actions?: Action[], vibrate?: number[]): Promise<number> {
    // webpush.setGCMAPIKey('<Your GCM API Key Here>');
    webpush.setVapidDetails(`mailto:${this.emailAddress}`, this.publicKey, this.privateKey);

    // This is the same output of calling JSON.stringify on a PushSubscription
    const pushSubscription = {
      endpoint,
      keys: { auth, p256dh },
    };

    const payload: NotificationPayload = { title, body, url: url, image, actions, vibrate };

    console.log('sending payload', payload);

    const sendResult = await webpush.sendNotification(pushSubscription, JSON.stringify(payload));

    return sendResult.statusCode;
  }
}
