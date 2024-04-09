import { Controller, Get, Logger, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { AccountParam, BalanceParam } from '@app/stellar-nest/decorators';
import { AccountResponse } from '@stellar/stellar-sdk/lib/horizon';

@Controller()
export class AppController {
  private readonly logger = new Logger('App');
  constructor(private readonly appService: AppService) {}

  @Get('')
  async getNews(
    @AccountParam('account', { accessor: 'headers' }) account: AccountResponse,
    /*  Parameter decorator returns an AccountResponse based on the headers named 'account'. 
   This leverages pre-module configuration to ensure correct server setup without additional configuration. */
  ): Promise<any> {
    try {
      const account2 = await this.appService.createAccountWithStellarNest();
      return 'created';
    } catch (e) {
      return e.message;
    }
  }
  @Get('emit')
  async getWithOtherWork(
    @AccountParam('account', { accessor: 'headers' }) account: AccountResponse,
    /*  Parameter decorator returns an AccountResponse based on the headers named 'account'. 
   This leverages pre-module configuration to ensure correct server setup without additional configuration. */
  ): Promise<any> {
    try {
      this.logger.log('Requesting account creation')
      const account2 = this.appService.createAccountWithStellarNest();
      this.logger.log('Something else to do while creation in the background', 'Exited')
      return 'created';
    } catch (e) {
      return 'si';
    }
  }

  @Get(':id')
  async accountFromParam(@AccountParam('id') account: AccountResponse) {
    /*  Parameter decorator returns an AccountResponse based on the param :id. 
       This leverages pre-module configuration to ensure correct server setup without additional configuration. */
    return account ? account : 'Account not found';
  }
  @Post('/purchase')
  async purchase(@BalanceParam('id', { assetCode: 'USDC', accessor: 'body' }) balance: string) {
    if (!balance) return "This account can't purchase"; /* Short circuit return */
    /* this.appService.registerTransaction(balance.account, body);  etc etc*/
    /* this.doSomethingLikeSaveTheLog */
    return balance;
  }
}
