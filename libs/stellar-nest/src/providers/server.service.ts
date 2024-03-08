import { Servers } from './../enums';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { STELLAR_OPTIONS } from '../constants';
import { StellarModuleConfig } from '../types';
import { Horizon } from '@stellar/stellar-sdk';
import { StellarModuleMode } from '../enums';

@Injectable()
export class ServerService implements OnModuleInit {
  private serverOptions: StellarModuleConfig['server'];
  public server: Horizon.Server;
  constructor(
    @Inject(STELLAR_OPTIONS) private readonly options: StellarModuleConfig,
  ) {}
  onModuleInit() {
    this.serverOptions = this.options.server || null;
    this.handleServer();
  }
  private handleServer() {
    if (!this.serverOptions)
      return (this.server = new Horizon.Server(
        Servers[this.options.mode || StellarModuleMode.TESTNET],
      ));
    this.server = new Horizon.Server(this.serverOptions.url);
  }
  public loadAccount(accountId: string){
      return this.server.loadAccount(accountId)
  }
  public async FriendBot(accountId: string){
    return await fetch(`https://friendbot.stellar.org?addr=${accountId}`);
  }
}
