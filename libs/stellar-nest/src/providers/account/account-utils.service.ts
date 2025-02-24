import { Injectable } from '@nestjs/common';
import { ServerService } from '../server.service';
import { Keypair } from '@stellar/stellar-sdk';
import { INVALID_SECRET, STELLAR_NATIVE } from '@app/stellar-nest/constants';
import { AccountResponse } from '@stellar/stellar-sdk/lib/horizon';

@Injectable()
export class AccountUtilsService {
  constructor(private readonly serverService: ServerService) {}
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
}
