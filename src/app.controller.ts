import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { AccountParam } from '@app/stellar-nest/decorators';
import { AccountResponse } from '@stellar/stellar-sdk/lib/horizon';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('')
  async getNews(
    @AccountParam('account', {accessor: 'headers'}) account: AccountResponse
  ): Promise<any> {
    try {
      const account = await this.appService.createAccountWithoutStellarNest();
      const account2 = await this.appService.createAccountWithStellarNest();
      return {account: account.publicKey(), account2: account2.publicKey()};
    } catch (e) {
      return 'si';
    }
  }
  @Get(':id')
  async accountFromParam(
    @AccountParam('id') account: AccountResponse
  ){
    return account ? account : 'Account not found';
  }


}

