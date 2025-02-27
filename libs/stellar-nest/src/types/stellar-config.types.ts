import { FactoryProvider, ModuleMetadata } from '@nestjs/common';
import { StellarModuleMode } from '../enums';
import { AccountConfig, CreateAccountConfig } from './stellar-accounts.types';

export type StellarGlobalConfig = {
  emitEvents?: boolean;
  mode: keyof typeof StellarModuleMode;
};

export type StellarAccountConfig = {
  create?: CreateAccountConfig;
  accounts: AccountConfig[];
};

export type StellarAssetsConfig = {
  create?: {
    by: string;
    distributorAccount: string;
  };
};
export type StellarServerConfig = {
  url?: string;
};

export type StellarModuleConfig = StellarGlobalConfig & {
  account: StellarAccountConfig;
  assets: StellarAssetsConfig;
  server?: StellarServerConfig;
  getSecret?: () => string[] | Promise<string[]>;
};

export interface StellarAsyncModuleConfig<T> extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: any[]) => Promise<T> | T;
  inject?: FactoryProvider['inject'];
}
