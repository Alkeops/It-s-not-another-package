import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  Asset,
  AuthRequiredFlag,
  BASE_FEE,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { AccountResponse } from '@stellar/stellar-sdk/lib/horizon';

import { ACCOUNT_CREATED, INVALID_ACCOUNT_TYPE, INVALID_SECRET, STELLAR_NATIVE, STELLAR_OPTIONS } from '../constants';
import { StellarModuleConfig } from '../types';

import { ServerService } from './server.service';
import { StellarModuleMode } from '../enums';
import { EmitEvent } from '../decorators/events.decorator';

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

  private async getTransactionActors() {
    const ACTORS = {
      parent: '',
      source: '',
      accountCreated: '',
    };
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
    if (!this.ownerAccounts && !secret) {
      throw new Error('Secret is required to create an account'); /* If !accounts & !frienbot
      ERROR ENUMS <-> for cases
      operationService ? by configs? sequenceService ? 
      
      */
    }
    const newPair = Keypair.random();
    if (!secret && !this.accountOptions?.parentAccount && this.options.mode === StellarModuleMode.TESTNET) {
      await this.serverService.FriendBot(newPair.publicKey()).catch((e) => e);
      if (this.options.emitEvents) return newPair;
      this.logger.log(
        'Account created and funded with Friendbot.',
        `https://stellar.expert/explorer/testnet/account/${newPair.publicKey()}`,
      );
      return newPair;
    }

    if (!this.accountsTypes.includes(this.accountOptions.parentAccount))
      throw new Error(
        `${INVALID_ACCOUNT_TYPE} valid types are [${this.accountsTypes.join(', ')}] not ${this.accountOptions.parentAccount}`,
      );

    const [pair, account] = await this.getAccountFromSecret(
      secret || this.ownerAccounts.find((a) => a.type === this.accountOptions.parentAccount)?.secret,
    );

    /* 2496260762239002 */
    /*  console.log(account.sequenceNumber()); */ /* Analyze sequence number ??? */
    /*  const [pair2, account2] = await this.getAccountFromSecret(
      'SAL65M2RRHDKU5L65MSKVGJEAPDQUBQMNM6VCZEY4XES65V77AKN7X2Y',
    ); */
    /* const otherPair = Keypair.random(); */
    const createAccountTx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks[this.options.mode || StellarModuleMode.TESTNET],
    }).addOperation(
      Operation.createAccount({
        destination: newPair.publicKey(),
        startingBalance:
          this.accountOptions.startingBalance || `${1 + (this.accountOptions.baseTrustline.length || 0) * 0.5}` /*,
          source: pair2.publicKey()  el que da los fondos si es diferente a A, debe firmar */,
      }),
    );
    /* Si existe sponsorship */
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
    /*'GASM4KCQ6NQFVGMIQFS5SPG5QLERYQTLO4OCWEKJEITBPWJRJWHEJ6MG' 'SDRKLD4BAYRDMICAAIWNYWSPPDECVGXQVM47G7M7SWEAVRCMUQBEUUIK'  */
    const transactionTx = createAccountTx
      /*  .addOperation(
        Operation.endSponsoringFutureReserves({
          source: newPair.publicKey(),
        }),
      ) */ /* solo si existe sponsorship */
      /*  .addOperation(
        Operation.createAccount({
          destination: otherPair.publicKey(),
          startingBalance: '20',
        }),
      ) */
      .addOperation(
        Operation.setOptions({
          source: newPair.publicKey(),
          homeDomain: 'www.marca.com',
        }),
      )
      .setTimeout(180)
      .build();

    const signers: Keypair[] = this.accountOptions.baseTrustline
      ? [pair, newPair]
      : [
          pair,
        ]; /* pair2 firma porque da los fondos, pair1 solo paga los fees, osea que se puede dividir para que la lista solo sea de cuentas creadas sin fees */

    transactionTx.sign(...signers);

    const response = await this.serverService.submitTransaction(transactionTx).catch((e) => e);
    this.logger.log(
      'Account created, see in.',
      `https://stellar.expert/explorer/testnet/account/${newPair.publicKey()}`,
    );
    return newPair;
  }
}

/* 
  Eliminar sponsorship 
  Merge account

*/
