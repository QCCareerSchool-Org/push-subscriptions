import webpush from 'web-push';

import type { IPushService } from '.';

export class WebPushPushService implements IPushService {

  public constructor(private readonly emailAddress: string, private readonly privateKey: string, private readonly publicKey: string) { /* empty */ }

  public async push(endpoint: string, p256dh: string, auth: string, heading: string, content: string, url: string | null): Promise<number> {
    // webpush.setGCMAPIKey('<Your GCM API Key Here>');
    webpush.setVapidDetails(`mailto:${this.emailAddress}`, this.publicKey, this.privateKey);

    // This is the same output of calling JSON.stringify on a PushSubscription
    const pushSubscription = {
      endpoint,
      keys: { auth, p256dh },
    };

    console.log('sending content', content);

    const sendResult = await webpush.sendNotification(pushSubscription, content);

    return sendResult.statusCode;
  }
}
