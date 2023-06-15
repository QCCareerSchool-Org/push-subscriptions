export type Environment = 'development' | 'production';

export type Config = {
  environment: Environment;
  port: number;
  auth: {
    cookieDomain: string;
    cookiePath: string;
    accessCookiePath: string | undefined;
    /** how long before access tokens should expire, in seconds */
    accessTokenLifetime: number;
    /** how long before refresh tokens should expire, in seconds */
    refreshTokenLifetime: number;
  };
  email: {
    host: string;
    port: number;
    user: string;
    pass: string;
    mode: 'TLS' | 'STARTTLS' | 'INSECURE';
  };
  vapid: {
    publicKey: string;
    privateKey: string;
  };
};

export interface IConfigService {
  config: Config;
}
