import type { Stream } from 'stream';

import { prisma } from '../frameworks/prisma';
import { dateService, ipaddrJSIPAddressService, uuidService, winstonLoggerService } from '../services';
import { UpdateSubscriptionInteractor } from './administrators/updateSubscriptionInteractor';
import { CreateSubscriptionInteractor } from './createSubscriptionInteractor';
import { DeleteSubscriptionsInteractor } from './deleteSubscriptionsInteractor';
import type { ResultType } from './result';
import { UpdateSubscriptionsInteractor } from './updateSubscriptionsInteractor';

export class InsufficientPrivileges extends Error { }

export interface IInteractor<RequestDTO, ResponseDTO> {
  execute: (arg: RequestDTO) => ResultType<ResponseDTO> | Promise<ResultType<ResponseDTO>>;
}

export type InteractorFileMemoryUpload = {
  data: Buffer;
  filename: string;
  mimeType: string;
  size: number;
};

export type InteractorFileDiskUpload = {
  path: string;
  filename: string;
  mimeType: string;
  size: number;
};

export type InteractorFileStreamUpload = {
  stream: Stream;
  filename: string;
  mimeType: string;
  size: number;
};

export type InteractorFileStreamDownload = {
  stream: Stream;
  filename: string;
  mimeType: string;
  size: number;
  lastModified: Date;
  maxAge: number;
  contentEncoding?: string;
  byteRange?: { start: number; end: number };
  download?: boolean;
};

export const createSubscriptionInteractor = new CreateSubscriptionInteractor(prisma, uuidService, dateService, ipaddrJSIPAddressService, winstonLoggerService);
export const updateSubscriptionsInteractor = new UpdateSubscriptionsInteractor(prisma, winstonLoggerService);
export const deleteSubscriptionsInteractor = new DeleteSubscriptionsInteractor(prisma, winstonLoggerService);
export const updateSubscriptionInteractor = new UpdateSubscriptionInteractor(prisma, uuidService, dateService, winstonLoggerService);
