import { Inject, Injectable, Logger } from '@nestjs/common';
import { StellarModuleConfig } from '../../types';
import { STELLAR_OPTIONS } from '../../constants';
import { ServerService } from '../server.service';
import { SignersService } from '../signers.service';
import { AssetsUtilsService } from './assets-utils.service';
import {
  Asset,
  AuthClawbackEnabledFlag,
  AuthRevocableFlag,
  BASE_FEE,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { AccountUtilsService } from '../account/account-utils.service';
import { StellarModuleMode } from '@app/stellar-nest/enums';

@Injectable()
export class AssetsService {
  private readonly logger = new Logger('stellar-nest/assets');
  private assetsOptions: StellarModuleConfig['assets']['create'];
  private ownerAccounts: StellarModuleConfig['account']['accounts'];
  constructor(
    @Inject(STELLAR_OPTIONS) private readonly options: StellarModuleConfig,
    private readonly assetsUtilsService: AssetsUtilsService,
    private readonly accountUtilsService: AccountUtilsService,
    private readonly serverService: ServerService,
    private readonly signersService: SignersService,
  ) {
    this.assetsOptions = this.options.assets.create;
    this.ownerAccounts = this.options.account.accounts || [];
  }
  public async createAsset({ assetName, amount }: { assetName: string; amount: number }, issuer?: string) {
    const { base = BASE_FEE } = await this.serverService.getFees();

    const ASSET_ISSUER = issuer || this.ownerAccounts.find((a) => a.type === this.assetsOptions.by)?.secret;
    const [sourcePair, sourceAccount] = await this.accountUtilsService.getAccountFromSecret(ASSET_ISSUER);
    if (await this.assetsUtilsService.doesAssetExist(assetName, sourcePair.publicKey())) {
      throw new Error(`Asset ${assetName} already exists`);
    }
    const asset = new Asset(assetName, sourcePair.publicKey());
    const createAssetTx = new TransactionBuilder(sourceAccount, {
      fee: base,
      networkPassphrase: Networks[this.options.mode || StellarModuleMode.TESTNET],
    })
      .addOperation(
        Operation.setOptions({
          setFlags: AuthRevocableFlag,
        }),
      )
      .addOperation(
        Operation.setOptions({
          setFlags: AuthClawbackEnabledFlag,
        }),
      );

    if (this.assetsOptions.distributorAccount && this.assetsOptions.distributorAccount !== this.assetsOptions.by) {
      const [distributorPair] = await this.accountUtilsService.getAccountFromSecret(
        this.ownerAccounts.find((a) => a.type === this.assetsOptions.distributorAccount)?.secret,
      );
      createAssetTx
        .addOperation(
          Operation.changeTrust({
            asset,
            source: distributorPair.publicKey(),
          }),
        )
        .addOperation(
          Operation.payment({
            destination: distributorPair.publicKey(),
            asset,
            amount: amount.toString(),
          }),
        );
    }
    const transactionTx = createAssetTx.setTimeout(180).build();
    const transactionSigned = this.signersService.signTransaction(transactionTx, [sourcePair]);
    const response = await this.serverService.submitTransaction(transactionSigned).catch((e) => e);
    this.logger.log(`Asset ${assetName} created `, response);
    return true;
  }
}
