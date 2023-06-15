import webpush from 'web-push';

import type { IPushService } from '.';

export class WebPushPushService implements IPushService {

  public constructor(private readonly emailAddress: string, private readonly privateKey: string, private readonly publicKey: string) { /* empty */ }

  public async push(endpoint: string, p256dh: string, auth: string, title: string, body: string, url: string | null, image?: string): Promise<number> {
    // webpush.setGCMAPIKey('<Your GCM API Key Here>');
    webpush.setVapidDetails(`mailto:${this.emailAddress}`, this.publicKey, this.privateKey);

    // This is the same output of calling JSON.stringify on a PushSubscription
    const pushSubscription = {
      endpoint,
      keys: { auth, p256dh },
    };

    const payload = { title, body, url, image };

    console.log('sending payload', payload);

    const sendResult = await webpush.sendNotification(pushSubscription, JSON.stringify(payload));

    return sendResult.statusCode;
  }
}
