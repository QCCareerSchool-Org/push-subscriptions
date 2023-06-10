import { NodemailerTransport } from '@qccareerschool/winston-nodemailer';
import type { Logger } from 'winston';
import { createLogger, format, transports } from 'winston';

import { environmentConfigService } from '..';
import type { ILoggerService } from '.';

export class WinstonLoggerService implements ILoggerService {

  private readonly logger: Logger;

  public constructor() {
    this.logger = createLogger({
      level: 'info',
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.json(),
      ),
      transports: [
        new transports.File({ filename: 'error.log', level: 'error' }),
        new transports.File({ filename: 'combined.log' }),
        new NodemailerTransport({
          auth: {
            pass: environmentConfigService.config.email.pass,
            user: environmentConfigService.config.email.user,
          },
          from: 'winston@qccareerschool.com',
          host: environmentConfigService.config.email.host,
          port: environmentConfigService.config.email.port,
          secure: environmentConfigService.config.email.mode === 'TLS',
          tags: [ 'push' ],
          to: 'administrator@qccareerschool.com',
          level: 'error',
        }),
      ],
    });

    //
    // If we're not in production then log to the `console` with the format:
    // `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
    //
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new transports.Console({
        format: format.simple(),
      }));
    }
  }

  public error(message: string, ...meta: unknown[]): void {
    this.logger.error(message, meta);
  }

  public warn(message: string, ...meta: unknown[]): void {
    this.logger.warn(message, meta);
  }

  public info(message: string, ...meta: unknown[]): void {
    this.logger.info(message, meta);
  }
}
