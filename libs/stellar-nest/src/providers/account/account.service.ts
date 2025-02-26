import { Inject, Injectable, Logger } from '@nestjs/common';
import { Asset, BASE_FEE, Keypair, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk';

import { INVALID_ACCOUNT_TYPE, STELLAR_OPTIONS } from '../../constants';
import { StellarModuleConfig } from '../../types';

import { ServerService } from '../server.service';
import { StellarModuleMode } from '../../enums';
import { AccountUtilsService } from './account-utils.service';
import { SignersService } from '../signers.service';

@Injectable()
export class AccountService {
  private readonly logger = new Logger('stellar-nest/account');
  private accountOptions: StellarModuleConfig['account']['create'];
  private ownerAccounts: StellarModuleConfig['account']['accounts'];
  private accountsTypes: string[];
  constructor(
    @Inject(STELLAR_OPTIONS) private readonly options: StellarModuleConfig,
    private readonly serverService: ServerService,
    private readonly accountUtilsService: AccountUtilsService,
    private readonly signersService: SignersService,
  ) {
    this.accountOptions = this.options.account.create;
    this.ownerAccounts = this.options.account.accounts || [];
    this.accountsTypes = this.ownerAccounts.map((a) => a.type);
  }

  private validateAccountType(): void {
    if (!this.accountsTypes.includes(this.accountOptions.by)) {
      throw new Error(
        `${INVALID_ACCOUNT_TYPE} valid types are [${this.accountsTypes.join(', ')}] not ${this.accountOptions.by}`,
      );
    }
    return;
  }

  public async createDemoAccount(): Promise<Keypair> {
    const newPair = Keypair.random();

    if (this.options.mode === StellarModuleMode.TESTNET) {
      this.logger.log('Funding Account with Friendbot');
      await this.serverService.FriendBot(newPair.publicKey()).catch((e) => e);
      this.logger.log(
        'Account created and funded with Friendbot.',
        `https://stellar.expert/explorer/testnet/account/${newPair.publicKey()}`,
      );
    }

    return newPair;
  }

  public async createAccount(secret?: string): Promise<Keypair> {
    this.logger.log('Creating an Account');
    const newPair = Keypair.random();

    this.validateAccountType();
    const { base = BASE_FEE } = await this.serverService.getFees();
    const [, account] = await this.accountUtilsService.getAccountFromSecret(
      secret || this.ownerAccounts.find((a) => a.type === this.options.account.create.by)?.secret,
    );
    const createAccountTx = new TransactionBuilder(account, {
      fee: base,
      networkPassphrase: Networks[this.options.mode || StellarModuleMode.TESTNET],
    }).addOperation(
      Operation.createAccount({
        destination: newPair.publicKey(),
        startingBalance: this.accountOptions.starting?.balance || '1',
      }),
    );

    if (this.accountOptions.starting?.homeDomain) {
      createAccountTx.addOperation(
        Operation.setOptions({
          homeDomain: this.accountOptions.starting.homeDomain,
          source: newPair.publicKey(),
        }),
      );
    }

    if (this.accountOptions.starting?.baseTrustline) {
      this.logger.log('Adding Trustlines');
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
    const transaction = this.signersService.signTransaction(transactionTx, [newPair]);
    await this.serverService.submitTransaction(transaction).catch((e) => e);
    this.logger.log(
      'Account created, see in.',
      `https://stellar.expert/explorer/testnet/account/${newPair.publicKey()}`,
    );
    return newPair;
  }

  public async deleteAccount(secret: string) {
    if (!this.accountOptions?.by) {
      throw new Error('Se debe mandar a alguna cuenta');
    }
    const [keypair, account] = await this.accountUtilsService.getAccountFromSecret(secret);
    const destination = this.ownerAccounts.find((a) => a.type === this.options.account.create.by)?.public;
    const { base = BASE_FEE } = await this.serverService.getFees();
    const transaction = new TransactionBuilder(account, {
      fee: base,
      networkPassphrase: Networks[this.options.mode || StellarModuleMode.TESTNET],
    });

    account.balances.forEach((asset: any) => {
      if (asset.asset_type !== 'native') {
        if (parseFloat(asset.balance) !== 0) {
          transaction.addOperation(
            Operation.payment({
              destination,
              asset: new Asset(asset.asset_code, asset.asset_issuer),
              amount: asset.balance,
            }),
          );
        }
        transaction.addOperation(
          Operation.changeTrust({
            asset: new Asset(asset.asset_code, asset.asset_issuer),
            limit: '0',
          }),
        );
      }
    });

    transaction.addOperation(
      Operation.accountMerge({
        destination,
      }),
    );

    const transactionTx = transaction.setTimeout(30).build();
    transactionTx.sign(keypair);
    await this.serverService.submitTransaction(transactionTx).catch((e) => e);
  }
  /*
  TODO configuración de cuenta
  async addSigners() {
    console.log('hi');
    const [mainKeypair, mainAccount] = await this.accountUtilsService.getAccountFromSecret(
      this.ownerAccounts.find((a) => a.type === this.options.account.create.by)?.secret,
    );
    const signerKeypairs = this.ownerAccounts
      .filter((account) => account.type === 'SIGNER') // Filtrar solo los SIGNER
      .map((account) => Keypair.fromSecret(account.secret));
    console.log(this.ownerAccounts);

    const transaction = new TransactionBuilder(mainAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks[this.options.mode || StellarModuleMode.TESTNET],
    });
    signerKeypairs.forEach((signer) => {
      transaction.addOperation(
        Operation.setOptions({
          signer: {
            ed25519PublicKey: signer.publicKey(),
            weight: 1,
          },
        }),
      );
    });
    transaction.addOperation(
      Operation.setOptions({
        masterWeight: 1,
        lowThreshold: 1,
        medThreshold: 5,
        highThreshold: 5,
      }),
    );
    const transactionTx = transaction.setTimeout(180).build();
    transactionTx.sign(mainKeypair);

    await this.serverService.submitTransaction(transactionTx).catch((e) => e);
    return true;
    {
    "public": "GAHMZPMECOVYRJ3A73JAX3TA2PWO2LTDKNTSP3O6D3MVCW3NRGPP2Z2U",
    "secret": "SBLOYT6VIV5R24QLHR52HGWFLF2BECZJG5IIRMYFNFJ7ZL24G6GLRPQZ"
}
    {
    "public": "GDENPGDJI2GR6ATBKO5YZH5LDD43JRI777OEAYJ73L2AUED7CW3XRY7N",
    "secret": "SC537M6NR4WBUPLTAGNMXU66RKEBORTTSUNI6UO67FR6HGZRQHCSOM4I"
}{
    "public": "GCGU3233I6SRX7T5JTWIKOYU4PSCUXPAPHMPZER2MVIPI56KEG7NYAIU",
    "secret": "SAQG42XBI7IK6LPRN42UBSGF22EDHRWXA5V2UOMNC76L6HRDPFSCUTV5"
}
  } */
}

/* Crear propiedad (Crea los tokens) –
Vender propiedad (recupera todos los tokens de esa propiedad) –

Distribuir renta [---] [usdc] (Lo usamos para convertir COP a USDC)

Crear cuenta (crea billetera y añade trustlines)
Comprar tokens (envia tokens Nauta a la billetera y descontaba usdc )
Vender tokens (¿¿??)

Retiro de fondos (Dan billetera y envía usdc, MEMO)

Balance - Muestra balance */
