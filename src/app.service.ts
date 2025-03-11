import {
  AccountService,
  AccountUtilsService,
  AdminService,
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
    private readonly adminService: AdminService,
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
    /* const e = await this.adminService.sendAdminPriorityPayment([
      {
        asset: 'CRYPTO:GDLKFAKOLCXRIIVAJNVIJFQFUZCTR4BOHUDIRE2C2CUBB3KI2PNQEXB3',
        amount: 200,
        to: { secretKey: 'SD4IYMB6XOPW332HONFIYHYRFG6U7KRUWG2LGS2YN6D6IHSYGLAEHSO7' },
      },
      {
        asset: 'CRYPTO22:GDLKFAKOLCXRIIVAJNVIJFQFUZCTR4BOHUDIRE2C2CUBB3KI2PNQEXB3',
        amount: 55,
        to: { secretKey: 'SDSAN7H5QKCMR54K3VHMBOS3AZC5K6AGWHRSN5426O43E2JXPR6KFEVL' },
      },
      {
        asset: 'VIEW63:GDLKFAKOLCXRIIVAJNVIJFQFUZCTR4BOHUDIRE2C2CUBB3KI2PNQEXB3',
        amount: 21,
        to: { secretKey: 'SD4IYMB6XOPW332HONFIYHYRFG6U7KRUWG2LGS2YN6D6IHSYGLAEHSO7' },
      },
    ]); */
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
    /* const e = await this.assetsService.createAsset({
      assetName: 'CRYPTO22',
      amount: 1000,
    }); */
    /* const e = await this.paymentService.sendHighPriorityPayment(
      [
        {
          asset: 'USDC:GCGIH7JG7XZYKKQEJO6XQIZRB3VYGQR2IMYMSZYLGG44CMDE4JMOQ3I4',
          amount: 12.33,
          to: {
            secretKey: 'SDT3XL4ZH3S6MM3NAG7EUKL2E3PH2BPIIT7D73RN6GF6VRPOEQNYV666',
          },
        },
      ],
      'SB5SUGIGVNLA4PUF4IDS3X6Z6CLT6U346I7AZ5PAQ6RHCRZT36GW3GS3',
    ); */
    /* const e = await this.assetsService.clawbackAsset(
      'GD3UFOSYPBYKPX7ATMTRJIK2EOLKQOUZHOBOQFVPB3Q2Z7NZ5DPKBN22',
      'UN0004',
      '99',
    ); */

    /* const e = await this.paymentUtilsService.validateTransaction(
      '3cc596a01cbd75ab7072fb89b87eea8d498bac918aed49c65b363e2574a26b87',
    ); */
    /* const e = await this.assetsService.clawbackAllAsset('UN0004'); */
    const e = await this.accountService.createAccount();
    /*
    this.logger.log(e.publicKey(), e.secret()); */
    /* const e = await this.accountService.addSigners(
      'GDLKFAKOLCXRIIVAJNVIJFQFUZCTR4BOHUDIRE2C2CUBB3KI2PNQEXB3',
      [
        {
          weight: 1,
          publicKey: 'GBMWKZEEPX753XHWI2IQOK3I7NGZNDX6QASNGASEU23EZ7JL3PMIETSV',
        },
      ],
      {
        masterWeight: 2,
        lowThreshold: 1,
        medThreshold: 2,
        highThreshold: 2,
      },
    ); */
    /*  const e = await this.accountService.createDemoAccount(); */
    return { public: e.publicKey(), secret: e.secret() };
  }
}

/*
{
  ISSUER: {
    "e": "GDLKFAKOLCXRIIVAJNVIJFQFUZCTR4BOHUDIRE2C2CUBB3KI2PNQEXB3",
    "s": "SBX7VMKGIMYNKNDPGPLLX7PVXQ3A2FOP572J2J3AUTRPH3LLM4R5WE5B"
}
   TODO NO TOMAR EN CUENTA SIGNER : {
    "e": "GAGSPMNRBMVEGVJCVSUKAFR2HMCV26QHH6IND2IR2K3GDRP5M2BZ2LSE",
    "s": "SC7L4YGVZWSGP5TLV3LB3WVV2VVXPTK2XIZKDAYJJAOYSOYVZZMZJLTX"
}
}

{ DISTRIBUTOR --->
    "public": "GDM7DRGAV76QKMBVU4PBXSEBAYBLVNWA544GBAHAY5TUQAJBOXKBWNAR",
    "secret": "SAH2PSQKZN6RUX3ZN4MDH3VMJJIZBMUF2HNNFFMJGTE2NE55XK7JYRAW"

  SIGNER ---> 
    {
    "public": "GBMWKZEEPX753XHWI2IQOK3I7NGZNDX6QASNGASEU23EZ7JL3PMIETSV",
    "secret": "SCZ5XWZ3UKEJUNZSMPMWO4DDC7AB2NG2GX2HUYXPPNPR36N2CY357LD6"
    }
}

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
