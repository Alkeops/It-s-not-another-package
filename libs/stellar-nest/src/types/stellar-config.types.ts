import { FactoryProvider, ModuleMetadata } from '@nestjs/common';
import { StellarModuleMode } from '../enums';
import { TAccountConfig, TCreateAccountConfig } from './stellar-accounts.types';
import { TAssetConfig } from './utils.types';
import { Horizon } from '@stellar/stellar-sdk';

export type StellarGlobalConfig = {
  emitEvents?: boolean;
  mode: keyof typeof StellarModuleMode;
  sponsored?: string;
  accounts?: TAccountConfig[];
};

export type StellarAccountConfig = {
  homeDomain?: string;
  source?: string;
  sponsored?: boolean | string;
  baseTrustline?: (string | TAssetConfig)[];
  startingBalance?: string;
  parentAccount?:   string;
};

export type StellarServerConfig = {
  url?: string;
  opts?: Horizon.Server.Options;
};

export type StellarModuleConfig = StellarGlobalConfig & {
  account?: StellarAccountConfig;
  server?: StellarServerConfig;
};

export interface StellarAsyncModuleConfig<T> extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: any[]) => Promise<T> | T;
  inject?: FactoryProvider['inject'];
}
