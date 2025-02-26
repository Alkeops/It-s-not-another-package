import {
  AccountService,
  AccountUtilsService,
  AssetsService,
  AssetsUtilsService,
  ServerService,
} from '@app/stellar-nest/providers';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Asset, BASE_FEE, Horizon, Keypair, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { PaymentUtilsService } from '../libs/stellar-nest/src/providers/transactions/payment-utils.service';
import { PaymentService } from '../libs/stellar-nest/src/providers/transactions/payment.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger('AppService');
  constructor(
    private readonly accountService: AccountService,
    private readonly accountUtilsService: AccountUtilsService,
    private readonly configService: ConfigService,
    private readonly assetUtilsService: AssetsUtilsService,
    private readonly assetsService: AssetsService,
    private readonly serverService: ServerService,
    private readonly paymentUtilsService: PaymentUtilsService,
    private readonly paymentService: PaymentService,
  ) {}

  async createAccountWithoutStellarNest() {
    const server = new Horizon.Server('https://horizon-testnet.stellar.org');
    const newPair = Keypair.random();
    const parentPair = Keypair.fromSecret(this.configService.get('PARENT_ACCOUNT_SECRET'));
    const parentAccount = await server.loadAccount(parentPair.publicKey());
    const { base = BASE_FEE } = await this.serverService.getFees();
    const transaction = new TransactionBuilder(parentAccount, {
      fee: base,
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
    /*  console.log(await this.serverService.getFees()); */
    /* const e = await this.paymentService.sendPaymentFeeBump(
      [
        {
          asset: 'USDC:GCGIH7JG7XZYKKQEJO6XQIZRB3VYGQR2IMYMSZYLGG44CMDE4JMOQ3I4',
          amount: 1,
          from: 'SD4IYMB6XOPW332HONFIYHYRFG6U7KRUWG2LGS2YN6D6IHSYGLAEHSO7',
          to: 'GC2WZEBJ5WT7J3WXUERXFOD3SRLDU3BJZIQ6XVBTQPMZFDSKMRQHVDR2',
        },
        {
          asset: 'USDC:GCGIH7JG7XZYKKQEJO6XQIZRB3VYGQR2IMYMSZYLGG44CMDE4JMOQ3I4',
          amount: 1,
          from: 'SD4IYMB6XOPW332HONFIYHYRFG6U7KRUWG2LGS2YN6D6IHSYGLAEHSO7',
          to: 'GAK27W77XVAC4B6AA36KC7OZU4763RGRBZZK5HGNM7NFII6KOPBRSHZS',
        },
        {
          asset: 'USDC:GCGIH7JG7XZYKKQEJO6XQIZRB3VYGQR2IMYMSZYLGG44CMDE4JMOQ3I4',
          amount: 1,
          from: 'SD4IYMB6XOPW332HONFIYHYRFG6U7KRUWG2LGS2YN6D6IHSYGLAEHSO7',
          to: 'GBBLODS4TF6QVXAQCYOBTJASWDSC7Z5JJCS3I2ID27OBXXPFA5HAZTFP',
        },
      ],
      'ISSUER',
    ); */
    /* const e = await this.paymentService.swapPayment(
      {
        asset: 'USDC:GCGIH7JG7XZYKKQEJO6XQIZRB3VYGQR2IMYMSZYLGG44CMDE4JMOQ3I4',
        amount: 1,
        from: 'SD4IYMB6XOPW332HONFIYHYRFG6U7KRUWG2LGS2YN6D6IHSYGLAEHSO7',
      },
      {
        asset: 'USDC:GCGIH7JG7XZYKKQEJO6XQIZRB3VYGQR2IMYMSZYLGG44CMDE4JMOQ3I4',
        amount: 3,
        from: 'SDSAN7H5QKCMR54K3VHMBOS3AZC5K6AGWHRSN5426O43E2JXPR6KFEVL',
      },
    ); */
    /* other things to do  */
    /*  const e = await this.assetsService.createAsset({
      assetName: 'UN0004',
      amount: 400000,
    }); */
    const e = await this.paymentService.sendPayment(
      [
        {
          asset: 'VIEW62:GCGIH7JG7XZYKKQEJO6XQIZRB3VYGQR2IMYMSZYLGG44CMDE4JMOQ3I4',
          amount: 1,
          to: {
            secretKey: 'SCOFFH6QNQ7E7BEPNUXBXGGDJTB54QUJQYQGLRIF7KIROIZCN5TJ3PKV',
          },
          trustline: 'OWNER',
        },
        {
          asset: 'MXNC:GCGIH7JG7XZYKKQEJO6XQIZRB3VYGQR2IMYMSZYLGG44CMDE4JMOQ3I4',
          amount: 20,
          to: {
            secretKey: 'SCOFFH6QNQ7E7BEPNUXBXGGDJTB54QUJQYQGLRIF7KIROIZCN5TJ3PKV',
          },
          trustline: 'OWNER',
        },
        {
          asset: 'UN0004:GCGIH7JG7XZYKKQEJO6XQIZRB3VYGQR2IMYMSZYLGG44CMDE4JMOQ3I4',
          amount: 600,
          to: {
            secretKey: 'SCOFFH6QNQ7E7BEPNUXBXGGDJTB54QUJQYQGLRIF7KIROIZCN5TJ3PKV',
          },
          trustline: 'OWNER',
        },
      ],
      'SB5SUGIGVNLA4PUF4IDS3X6Z6CLT6U346I7AZ5PAQ6RHCRZT36GW3GS3',
    );

    /* const e = await this.accountService.createAccount();

    this.logger.log(e.publicKey(), e.secret()); */
    return { e };
  }
}

/* 

check trnasfer status
GD3UFOSYPBYKPX7ATMTRJIK2EOLKQOUZHOBOQFVPB3Q2Z7NZ5DPKBN22
SCOFFH6QNQ7E7BEPNUXBXGGDJTB54QUJQYQGLRIF7KIROIZCN5TJ3PKV

SPONSORED
GCO7GUKMMD2JKX5DY5HZMJNTY3PYDIKAVKNODZUGH7VO4JS2IQA6POVO SD72FHUVWX5Z7TDDH6PXEYE7NJULEN3VORKKGY4TSFUTHFZCMQ4QGZUR
SPONSORED


GB4QR5LWRVJUMC6FZTS3PLTBKNP2LN7LB5CBZILO6WPZSK2HEZOGIDSO
SD4IYMB6XOPW332HONFIYHYRFG6U7KRUWG2LGS2YN6D6IHSYGLAEHSO7

GAK27W77XVAC4B6AA36KC7OZU4763RGRBZZK5HGNM7NFII6KOPBRSHZS
SDT3XL4ZH3S6MM3NAG7EUKL2E3PH2BPIIT7D73RN6GF6VRPOEQNYV666

GBBLODS4TF6QVXAQCYOBTJASWDSC7Z5JJCS3I2ID27OBXXPFA5HAZTFP
SDSAN7H5QKCMR54K3VHMBOS3AZC5K6AGWHRSN5426O43E2JXPR6KFEVL

*/
