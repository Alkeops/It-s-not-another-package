import { ACCOUNT_CREATED } from '@app/stellar-nest/constants';
import { AccountService } from '@app/stellar-nest/providers';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { Asset, BASE_FEE, Horizon, Keypair, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk';

@Injectable()
export class AppService {
  constructor(
    private readonly accountService: AccountService,
    private readonly configService: ConfigService,
  ) {}
  async createAccountWithoutStellarNest() {
    const server = new Horizon.Server('https://horizon-testnet.stellar.org');
    const newPair = Keypair.random();
    const parentPair = Keypair.fromSecret(this.configService.get('PARENT_ACCOUNT_SECRET'));
    const parentAccount = await server.loadAccount(parentPair.publicKey());
    const transaction = new TransactionBuilder(parentAccount, {
      fee: BASE_FEE,
      networkPassphrase: process.env.NODE_ENV !== 'production' ? Networks.TESTNET : Networks.PUBLIC,
    })
      .addOperation(
        Operation.createAccount({
          destination: newPair.publicKey(),
          startingBalance: '8',
        }),
      )
      .addOperation(
        Operation.changeTrust({
          asset: new Asset('USDC', this.configService.get('USDC_ISSUER')),
          source: newPair.publicKey(),
        }),
      )
      .setTimeout(0)
      .build();

    transaction.sign(newPair, parentPair);
    await server.submitTransaction(transaction).catch((e) => e);

    /* other things to do  */

    return newPair;
  }
  
  async createAccountWithStellarNest() {
    const newPair = await this.accountService.createAccount();
    /* other things to do  */
    return newPair;
  }

  /* Example of event-driven flow */
  @OnEvent(ACCOUNT_CREATED)
  async anotherMethod(pair: Keypair){
    console.log('Account created', pair.publicKey());
    /* DO something */
    return
  }
}
