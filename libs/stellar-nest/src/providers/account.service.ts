import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  Asset,
  BASE_FEE,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { AccountResponse } from '@stellar/stellar-sdk/lib/horizon';

import { INVALID_ACCOUNT_TYPE, INVALID_SECRET, STELLAR_NATIVE, STELLAR_OPTIONS } from '../constants';
import { StellarModuleConfig } from '../types';

import { ServerService } from './server.service';
import { StellarModuleMode } from '../enums';
import { EmitEvent } from '../decorators/events.decorator';
import { TActors } from '../types/stellar-accounts.types';

@Injectable()
export class AccountService {
  private readonly logger = new Logger('stellar-nest');
  private accountOptions: StellarModuleConfig['account'];
  private ownerAccounts: StellarModuleConfig['accounts'];
  private accountsTypes: string[];
  constructor(
    @Inject(STELLAR_OPTIONS) private readonly options: StellarModuleConfig,
    private readonly serverService: ServerService,
  ) {
    this.accountOptions = this.options.account;
    this.ownerAccounts = this.options.accounts || [];
    this.accountsTypes = this.ownerAccounts.map((a) => a.type);
  }

  private async getTransactionActors(): Promise<TActors> {
    if (!this.accountsTypes.includes(this.accountOptions.parentAccount))
      throw new Error(
        `${INVALID_ACCOUNT_TYPE} valid types are [${this.accountsTypes.join(', ')}] not ${this.accountOptions.parentAccount}`,
      );
    const newPair = Keypair.random();

    try {
      let ACTORS = {
        parent: await this.getAccountFromSecret(
          this.ownerAccounts.find((a) => a.type === this.accountOptions.parentAccount)?.secret,
        ),
        source: this.accountOptions.source
          ? await this.getAccountFromSecret(
              this.ownerAccounts.find((a) => a.type === this.accountOptions.source)?.secret,
            )
          : null,
        sponsor: this.accountOptions.sponsored
          ? await this.getAccountFromSecret(
              this.ownerAccounts.find((a) => a.type === this.accountOptions.sponsored)?.secret,
            )
          : null,
        accountCreated: [newPair],
      };
      return ACTORS;
    } catch (e) {
      throw e;
    }
  }

  private getSigners(actors: TActors): Keypair[] {
    const signers: Keypair[] = Object.keys(actors).reduce((acc: Keypair[], key: string) => {
      const signer = actors?.[key]?.[0];
      if (signer) {
        acc = [...acc, signer];
      }
      return acc;
    }, []);

    console.log(signers);
    return signers;
  }

  public isValidAccount(accountId: string) {
    try {
      Keypair.fromPublicKey(accountId);
      return true;
    } catch (e) {
      return false;
    }
  }

  public async getAccount(accountId: string) {
    const isValid = this.isValidAccount(accountId);
    return isValid ? this.serverService.loadAccount(accountId) : null;
  }

  public async getBalances(accountId: string, assetCode?: string) {
    const account = await this.getAccount(accountId);
    if (!assetCode) return account.balances;

    return account.balances.find((b: any) =>
      assetCode === STELLAR_NATIVE ? b.asset_type === assetCode : b.asset_code === assetCode,
    );
  }

  public getPairFromSecret(secret: string) {
    try {
      return Keypair.fromSecret(secret);
    } catch (e) {
      throw new Error(INVALID_SECRET);
    }
  }

  public async getAccountFromSecret(secret: string): Promise<[Keypair, AccountResponse]> {
    const pair = this.getPairFromSecret(secret);
    return [pair, await this.getAccount(pair.publicKey())];
  }

  public async createAccount(secret?: string): Promise<Keypair> {
    const ACTORS = await this.getTransactionActors();

    const {
      parent: [pairParent, accountParent],
      source,
      sponsor,
      accountCreated: [newPair],
    } = ACTORS;

    const createAccountTx = new TransactionBuilder(accountParent, {
      fee: BASE_FEE,
      networkPassphrase: Networks[this.options.mode || StellarModuleMode.TESTNET],
    });

    if (sponsor) {
      createAccountTx.addOperation(
        Operation.beginSponsoringFutureReserves({
          sponsoredId: newPair.publicKey(),
          source: sponsor[0].publicKey(),
        }),
      );
    }

    createAccountTx.addOperation(
      Operation.createAccount({
        destination: newPair.publicKey(),
        startingBalance:
          this.accountOptions.startingBalance || `${1 + (this.accountOptions.baseTrustline.length || 0) * 0.5}`,
      }),
    );

    if (this.accountOptions?.baseTrustline) {
      const trustlines = this.accountOptions.baseTrustline.map((t) => {
        if (typeof t === 'string') return t.split(':');
        return t[this.options.mode || StellarModuleMode.TESTNET].split(':');
      });

      trustlines.forEach((t: [string, string]) => {
        createAccountTx.addOperation(
          Operation.changeTrust({
            asset: new Asset(...t),
            source: newPair.publicKey(),
          }),
        );
      });
    }

    if (this.accountOptions?.homeDomain) {
      createAccountTx.addOperation(
        Operation.setOptions({
          source: newPair.publicKey(),
          homeDomain: this.accountOptions.homeDomain,
        }),
      );
    }

    if (sponsor) {
      createAccountTx.addOperation(
        Operation.endSponsoringFutureReserves({
          source: newPair.publicKey(),
        }),
      );
    }
    const transactionTx = createAccountTx.setTimeout(180).build();

    transactionTx.sign(...this.getSigners(ACTORS));

    const response = await this.serverService.submitTransaction(transactionTx).catch((e) => e);
    console.log(newPair.publicKey(), newPair.secret());
    this.logger.log(
      'Account created, see in.',
      `https://stellar.expert/explorer/testnet/account/${newPair.publicKey()}`,
    );

    return newPair;
  }

  public async deleteAccount(secret: string) {
    
  
    const ACTORS = await this.getTransactionActors();
    const {
      parent: [pairParent, accountParent],
    } = ACTORS;

    const [pair, account] = await this.getAccountFromSecret(secret);

    const deleteAccountTx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks[this.options.mode || StellarModuleMode.TESTNET],
    });

    account.balances.forEach((asset: any) => {
      if (parseFloat(asset.balance) !== 0 && asset.asset_type !== 'native') {
        deleteAccountTx.addOperation(
          Operation.payment({
            destination: pairParent.publicKey(),
            asset: new Asset(asset.asset_code, asset.asset_issuer),
            amount: asset.balance,
          }),
        );
      }

      if (asset.asset_type !== 'native') {
        deleteAccountTx.addOperation(
          Operation.changeTrust({
            asset: new Asset(asset.asset_code, asset.asset_issuer),
            limit: '0',
          }),
        );
      }
    });

    deleteAccountTx.addOperation(
      Operation.accountMerge({
        destination: pairParent.publicKey(),
      }),
    );

    const transactionTx = deleteAccountTx.setTimeout(180).build();

    transactionTx.sign(pair);

    const response = await this.serverService.submitTransaction(transactionTx).catch((e) => e);
    
  }
}