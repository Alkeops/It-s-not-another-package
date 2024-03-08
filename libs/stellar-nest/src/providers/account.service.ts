import { Inject, Injectable } from '@nestjs/common';
import { Asset, BASE_FEE, Keypair, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { AccountResponse } from '@stellar/stellar-sdk/lib/horizon';

import { INVALID_ACCOUNT_TYPE, INVALID_SECRET, STELLAR_NATIVE, STELLAR_OPTIONS } from '../constants';
import { StellarModuleConfig } from '../types';

import { ServerService } from './server.service';
import { StellarModuleMode } from '../enums';

@Injectable()
export class AccountService {
  private accountOptions: StellarModuleConfig['account']['create'];
  private ownerAccounts: StellarModuleConfig['account']['accounts'];
  private accountsTypes: string[];
  constructor(
    @Inject(STELLAR_OPTIONS) private readonly options: StellarModuleConfig,
    private readonly serverService: ServerService,
  ) {
    this.accountOptions = this.options.account.create;
    this.ownerAccounts = this.options.account.accounts || [];
    this.accountsTypes = this.ownerAccounts.map((a) => a.type);
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
    const newPair = Keypair.random();
    if (!secret && !this.accountOptions.by && this.options.mode === StellarModuleMode.TESTNET) {
      await this.serverService.FriendBot(newPair.publicKey()).catch((e) => e);
      return newPair;
    }
    if (!this.accountsTypes.includes(this.accountOptions.by))
      throw new Error(
        `${INVALID_ACCOUNT_TYPE} valid types are [${this.accountsTypes.join(', ')}] not ${this.accountOptions.by}`,
      );
    const [pair, account] = await this.getAccountFromSecret(
      secret || this.ownerAccounts.find((a) => a.type === this.options.account.create.by)?.secret,
    );

    const createAccountTx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks[this.options.mode || StellarModuleMode.TESTNET],
    }).addOperation(
      Operation.createAccount({
        destination: newPair.publicKey(),
        startingBalance: this.accountOptions.starting.balance || '1',
      }),
    );

    if (this.accountOptions.starting.baseTrustline) {
      const trustlines = this.accountOptions.starting.baseTrustline.map((t) => {
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

    const transactionTx = createAccountTx.setTimeout(180).build();

    const signers: Keypair[] = this.accountOptions.starting.baseTrustline ? [pair, newPair] : [pair];

    transactionTx.sign(...signers);

    await this.serverService.server.submitTransaction(transactionTx).catch((e) => e);

    return newPair;
  }
}
