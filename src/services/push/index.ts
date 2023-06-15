export type Action = {
  /** A string identifying a user action to be displayed on the notification. */
  action: string;
  /** A string containing action text to be shown to the user. */
  title: string;
  /** A string containing the URL of an icon to display with the action. */
  icon?: string;
};

export interface IPushService {
  /**
   * Sends a push notification
   * @param endpoint the push notification endpoint
   * @param p256dh
   * @param auth
   * @param title
   * @param body
   * @param url the url for the user to navigate to when the notification is clicked
   * @param image a public url to an image
   * @returns a promise indicating the http response code
   */
  push: (endpoint: string, p256dh: string, auth: string, title: string, body: string, url?: string, image?: string, action?: Action[], vibrate?: number[]) => Promise<number>;
}
