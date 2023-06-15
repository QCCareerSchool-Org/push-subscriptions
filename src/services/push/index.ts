export interface IPushService {
  push: (endpoint: string, p256dh: Buffer | null, auth: Buffer | null, heading: string, content: string, url: string | null) => Promise<number>;
}
