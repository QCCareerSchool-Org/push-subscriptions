export interface IPushService {
  push: (endpoint: string, p256dh: string, auth: string, title: string, body: string, url: string | null) => Promise<number>;
}
