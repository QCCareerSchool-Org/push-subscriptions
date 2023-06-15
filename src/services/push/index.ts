export interface IPushService {
  push: (endpoint: string, p256dh: string, auth: string, heading: string, content: string, url: string | null) => Promise<number>;
}
