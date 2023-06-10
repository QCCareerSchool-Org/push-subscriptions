export type Environment = 'development' | 'production';

export type Config = {
  environment: Environment;
  port: number;
  email: {
    host: string;
    port: number;
    user: string;
    pass: string;
    mode: 'TLS' | 'STARTTLS' | 'INSECURE';
  };
};

export interface IConfigService {
  config: Config;
}
