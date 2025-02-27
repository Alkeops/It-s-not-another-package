import { Inject, Injectable } from '@nestjs/common';
import { ServerService } from '../server.service';
import { Asset, BASE_FEE, Keypair, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { AccountUtilsService } from '../account/account-utils.service';
import { STELLAR_OPTIONS } from '@app/stellar-nest/constants';
import { StellarModuleConfig } from '@app/stellar-nest/types';
import { StellarModuleMode } from '@app/stellar-nest/enums';
import { PaymentUtilsService } from './payment-utils.service';
import { SignersService } from '../signers.service';

type TPayment = {
  asset: string;
  amount: number;
  memo?: string | Uint8Array | number;
  to: { publicKey?: string; secretKey?: string };
  trustline?: string;
};

type TSender = {
  from: string;
  asset: string;
  amount: number;
  memo?: string | Uint8Array | number;
};

@Injectable()
export class PaymentService {
  private ownerAccounts: StellarModuleConfig['account']['accounts'];
  constructor(
    @Inject(STELLAR_OPTIONS) private readonly options: StellarModuleConfig,
    private readonly serverService: ServerService,
    private readonly accountUtilsService: AccountUtilsService,
    private readonly paymentUtilsService: PaymentUtilsService,
    private readonly signersService: SignersService,
  ) {
    this.ownerAccounts = this.options.account.accounts || [];
  }

  private getAsset(asset: string): Asset {
    if (asset === 'XLM') {
      return Asset.native();
    }
    return new Asset(asset.split(':')[0], asset.split(':')[1]);
  }

  public async sendPayment(payments: TPayment[], from: string, feeBump?: boolean) {
    if (!payments.length) throw new Error('No payments to send');

    const { base = BASE_FEE } = await this.serverService.getFees();
    const [sourcePair, sourceAccount] = await this.accountUtilsService.getAccountFromSecret(from);

    const sendAssetTransaction = new TransactionBuilder(sourceAccount, {
      fee: base,
      networkPassphrase: Networks[this.options.mode || StellarModuleMode.TESTNET],
    });
    let extraSigners: Keypair[] = [sourcePair];

    for (const { asset, amount, to, memo, trustline = null } of payments) {
      const ASSET = this.getAsset(asset);

      if (!this.paymentUtilsService.validateAssetBalance(from, ASSET, amount)) {
        throw new Error('Insufficient balance');
      }
      const publicKey = to.secretKey ? Keypair.fromSecret(to.secretKey).publicKey() : to.publicKey;
      const hasTrustline = await this.accountUtilsService.getBalances(publicKey, ASSET.code);

      if (!hasTrustline && to.secretKey && asset !== 'XLM') {
        const balances: any = await this.accountUtilsService.getBalances(publicKey);
        const xlm = parseFloat((balances.find((b) => b.asset_type === 'native') || { balance: 0 }).balance);
        const xlmUsed = (balances.filter((b) => b.asset_type !== 'native') || []).length * 0.6;
        if (xlm < xlmUsed + 1.5 && !trustline) {
          throw new Error('Insufficient balance');
        }
        if (trustline && xlm < xlmUsed + 2) {
          const sponsor = this.ownerAccounts.find((a) => a.type === trustline);
          console.log(xlm, xlmUsed, trustline, sponsor.public);
          sendAssetTransaction.addOperation(
            Operation.payment({
              destination: publicKey,
              asset: Asset.native(),
              amount: '0.5',
              source: sponsor.public,
            }),
          );
        }
        extraSigners = [...extraSigners, Keypair.fromSecret(to.secretKey)];
        sendAssetTransaction.addOperation(
          Operation.changeTrust({
            asset: ASSET,
            source: publicKey,
          }),
        );
      }

      sendAssetTransaction.addOperation(
        Operation.payment({
          destination: publicKey,
          asset: ASSET,
          amount: amount.toString(),
        }),
      );

      if (memo) {
        sendAssetTransaction.addMemo(this.paymentUtilsService.validateMemo(memo));
      }
    }
    const transaction = sendAssetTransaction.setTimeout(30).build();
    const transactionSigned = this.signersService.signTransaction(transaction, extraSigners);

    if (feeBump) {
      return transactionSigned;
    }

    await this.serverService.submitTransaction(transactionSigned);

    return transaction.hash().toString('hex');
  }

  public async sendHighPriorityPayment({ asset, amount, memo, to }: TPayment, from: string, feePayer?: string) {
    const transaction = await this.sendPayment([{ asset, amount, memo, to }], from, true);
    if (typeof transaction === 'string') {
      return transaction;
    }
    const { max = BASE_FEE } = await this.serverService.getFees();
    const source = feePayer ? this.ownerAccounts.find((a) => a.type === feePayer)?.secret : from;
    const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
      Keypair.fromSecret(source),
      max,
      transaction,
      Networks[this.options.mode || StellarModuleMode.TESTNET],
    );
    feeBumpTx.sign(Keypair.fromSecret(source));
    await this.serverService.submitTransaction(feeBumpTx);

    return transaction.hash().toString('hex');
  }

  public async sendPaymentFeeBump(payments: TPayment[], from: string, feePayer: string) {
    if (!feePayer || !payments.length) {
      return false;
    }
    const transaction = await this.sendPayment(payments, from, true);
    if (typeof transaction === 'string') {
      return transaction;
    }
    const { max = BASE_FEE } = await this.serverService.getFees();
    const source = this.ownerAccounts.find((a) => a.type === feePayer)?.secret;

    const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
      Keypair.fromSecret(source),
      max,
      transaction,
      Networks[this.options.mode || StellarModuleMode.TESTNET],
    );
    feeBumpTx.sign(Keypair.fromSecret(source));
    await this.serverService.submitTransaction(feeBumpTx);

    return transaction.hash().toString('hex');
  }

  public async swapPayment(sender: TSender, recipient: TSender) {
    /* Revisar si A y B tienen trustlines para lo que van a recibir */
    try {
      const { max = BASE_FEE } = await this.serverService.getFees();
      const [sourcePair, sourceAccount] = await this.accountUtilsService.getAccountFromSecret(sender.from);

      const sendAssetTransaction = new TransactionBuilder(sourceAccount, {
        fee: max,
        networkPassphrase: Networks[this.options.mode || StellarModuleMode.TESTNET],
      });

      const senderAsset = this.getAsset(sender.asset);
      const recipientAsset = this.getAsset(recipient.asset);

      if (!this.paymentUtilsService.validateAssetBalance(sender.from, senderAsset, sender.amount)) {
        return false;
      }

      sendAssetTransaction.addOperation(
        Operation.payment({
          asset: senderAsset,
          amount: sender.amount.toString(),
          destination: Keypair.fromSecret(recipient.from).publicKey(),
        }),
      );

      sendAssetTransaction.addOperation(
        Operation.payment({
          source: Keypair.fromSecret(recipient.from).publicKey(),
          asset: recipientAsset,
          amount: recipient.amount.toString(), // B envía sendAmount
          destination: Keypair.fromSecret(sender.from).publicKey(),
        }),
      );

      if (sender.memo) {
        sendAssetTransaction.addMemo(this.paymentUtilsService.validateMemo(sender.memo));
      }

      const transaction = sendAssetTransaction.setTimeout(30).build();
      transaction.sign(sourcePair);
      transaction.sign(Keypair.fromSecret(recipient.from));

      await this.serverService.submitTransaction(transaction);
      return true;
    } catch (e) {
      console.log(e.response);
      return e.response.data;
    }
  }
}

/* 
public async swapPayment(sender: TSender, recipient: TSender) {
    try {
      const { max = BASE_FEE } = await this.serverService.getFees();
      const [sourcePair, sourceAccount] = await this.accountUtilsService.getAccountFromSecret(sender.from);

      const sendAssetTransaction = new TransactionBuilder(sourceAccount, {
        fee: max,
        networkPassphrase: Networks[this.options.mode || StellarModuleMode.TESTNET],
      });

      const senderAsset = this.getAsset(sender.asset);
      const recipientAsset = this.getAsset(recipient.asset);

      if (!this.paymentUtilsService.validateAssetBalance(sender.from, senderAsset, sender.amount)) {
        return false;
      }

      sendAssetTransaction.addOperation(
        Operation.payment({
          asset: senderAsset,
          amount: sender.amount.toString(),
          destination: Keypair.fromSecret(recipient.from).publicKey(),
        }),
      );

      sendAssetTransaction.addOperation(
        Operation.payment({
          source: Keypair.fromSecret(recipient.from).publicKey(),
          asset: recipientAsset,
          amount: recipient.amount.toString(), // B envía sendAmount
          destination: Keypair.fromSecret(sender.from).publicKey(),
        }),
      );

      if (sender.memo) {
        sendAssetTransaction.addMemo(this.paymentUtilsService.validateMemo(sender.memo));
      }

      const transaction = sendAssetTransaction.setTimeout(30).build();
      transaction.sign(sourcePair);
      transaction.sign(Keypair.fromSecret(recipient.from));

      await this.serverService.submitTransaction(transaction);
      return true;
    } catch (e) {
      console.log(e.response);
      return e.response.data;
    }
  }
Para evitar problemas claimable balance
const sendAssetTransaction = new TransactionBuilder(sourceAccount, {
      fee: max,
      networkPassphrase: Networks[this.options.mode || StellarModuleMode.TESTNET],
    }).addOperation(
      Operation.createClaimableBalance({
        claimants: [new Claimant(to, Claimant.predicateUnconditional())],
        asset,
        amount: amount.toString(),
      }),
    ); */
