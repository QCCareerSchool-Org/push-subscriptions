import webPush from 'web-push';

import type { IPushService } from '.';

export class WebPushPushService implements IPushService {

  public constructor(private readonly privateKey: string, private readonly publicKey: string) { /* empty */ }

  public async push(endpoint: string, p256dh: Buffer | null, auth: Buffer | null, heading: string, content: string, url: string | null): Promise<number> {
    await new Promise(res => setTimeout(res, 10_000));
    return 200;
  }
}
