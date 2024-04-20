import { Keypair } from '@stellar/stellar-sdk';
import { TAssetConfig } from './utils.types';
import { AccountResponse } from '@stellar/stellar-sdk/lib/horizon';

export type TAccountConfig = {
  type: string;
  public: string;
  secret: string;
};

export type TCreateAccountConfig = {
  by?: string;
  starting?: {
    balance: string;
    baseTrustline?: (string | TAssetConfig)[];
  };
};

export type TActors = {
  parent: [Keypair, AccountResponse];
  source: [Keypair, AccountResponse] | null;
  sponsor: [Keypair, AccountResponse] | null;
  accountCreated: Keypair[];
};
