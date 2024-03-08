import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get(':id')
  async getNews(
  ): Promise<any> {
    try {
      const account = await this.appService.createAccountWithoutStellarNest();
      const account2 = await this.appService.createAccountWithStellarNest();
      return {account: account.publicKey(), account2: account2.publicKey()};
    } catch (e) {
      console.log(e)
      return 'si';
    }
  }
}

