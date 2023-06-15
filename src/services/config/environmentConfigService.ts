import dotenv from 'dotenv';

import type { Config, IConfigService } from '.';

dotenv.config();

export class EnvironmentConfigService implements IConfigService {
  static #defaultPort = 8080;

  public readonly config: Config;

  public constructor() {
    const environment = process.env.NODE_ENV;
    if (environment !== 'development' && environment !== 'production') {
      throw Error('Environment variable NODE_ENV must be \'development\' or \'production\'');
    }

    const port = process.env.PORT
      ? parseInt(process.env.PORT, 10)
      : EnvironmentConfigService.#defaultPort;

    const smtpHost = process.env.SMTP_HOST;
    if (typeof smtpHost === 'undefined') {
      throw Error('Environment variable SMTP_HOST is undefined');
    }

    const smtpPort = process.env.SMTP_PORT;
    if (typeof smtpPort === 'undefined') {
      throw Error('Environment variable SMTP_PORT is undefined');
    }
    const smtpPortNumber = parseInt(smtpPort, 10);
    if (isNaN(smtpPortNumber)) {
      throw Error('Environment variable SMTP_PORT is invalid');
    }

    const smtpUser = process.env.SMTP_USERNAME;
    if (typeof smtpUser === 'undefined') {
      throw Error('Environment variable SMTP_USERNAME is undefined');
    }

    const smtpPassword = process.env.SMTP_PASSWORD;
    if (typeof smtpPassword === 'undefined') {
      throw Error('Environment variable SMTP_PASSWORD is undefined');
    }

    const smtpMode = process.env.SMTP_MODE;
    if (typeof smtpMode === 'undefined') {
      throw Error('Environment variable SMTP_MODE is undefined');
    }
    if (smtpMode !== 'TLS' && smtpMode !== 'STARTTLS' && smtpMode !== 'INSECURE') {
      throw Error('Environment variable SMTP_MODE is invalid');
    }

    const pushEmailAddress = process.env.PUSH_EMAIL_ADDRESS;
    if (typeof pushEmailAddress === 'undefined') {
      throw Error('Environment variable PUSH_EMAIL_ADDRESS is undefined');
    }

    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    if (typeof vapidPrivateKey === 'undefined') {
      throw Error('Environment variable VAPID_PRIVATE_KEY is undefined');
    }

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    if (typeof vapidPublicKey === 'undefined') {
      throw Error('Environment variable VAPID_PUBLIC_KEY is undefined');
    }

    this.config = {
      environment,
      port,
      auth: {
        cookieDomain: process.env.COOKIE_DOMAIN ?? 'push.qccareerschool.com',
        cookiePath: process.env.COOKIE_PATH ?? '/',
        accessCookiePath: process.env.ACCESS_COOKIE_PATH,
        accessTokenLifetime: process.env.ACCESS_TOKEN_LIFETIME ? parseInt(process.env.ACCESS_TOKEN_LIFETIME, 10) : 30 * 60, // 30-minute default
        refreshTokenLifetime: process.env.REFRESH_TOKEN_LIFETIME ? parseInt(process.env.REFRESH_TOKEN_LIFETIME, 10) : 30 * 60 * 60 * 24, // 30-day default
      },
      email: {
        host: smtpHost,
        port: smtpPortNumber,
        user: smtpUser,
        pass: smtpPassword,
        mode: smtpMode,
      },
      push: {
        emailAddress: pushEmailAddress,
        vapid: {
          privateKey: vapidPrivateKey,
          publicKey: vapidPublicKey,
        },
      },
    };
  }

  // public get config(): Config { return this.#config; }
}
