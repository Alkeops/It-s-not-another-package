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
  to: { publicKey?: string; secretKey?: string };
};

type TSender = {
  secretKey: string;
  asset: string;
  amount: number;
};

@Injectable()
export class PaymentService {
  constructor(
    @Inject(STELLAR_OPTIONS) private readonly options: StellarModuleConfig,
    private readonly serverService: ServerService,
    private readonly accountUtilsService: AccountUtilsService,
    private readonly paymentUtilsService: PaymentUtilsService,
    private readonly signersService: SignersService,
  ) {}

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

    for (const { asset, amount, to } of payments) {
      const ASSET = this.getAsset(asset);

      if (!this.paymentUtilsService.validateAssetBalance(from, ASSET, amount)) {
        throw new Error('Insufficient balance');
      }
      const publicKey = to.secretKey ? Keypair.fromSecret(to.secretKey).publicKey() : to.publicKey;
      const hasTrustline = await this.accountUtilsService.getBalances(publicKey, ASSET.code);

      if (!hasTrustline && to.secretKey && asset !== 'XLM') {
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
    }
    const transaction = sendAssetTransaction.setTimeout(30).build();
    const [transactionSigned] = await this.signersService.signTransaction(transaction, extraSigners);

    if (feeBump) {
      return transactionSigned;
    }

    await this.serverService.submitTransaction(transactionSigned);

    return transaction.hash().toString('hex');
  }

  public async sendHighPriorityPayment(payments: TPayment[], secretKey: string) {
    if (!payments.length) {
      return false;
    }
    const transaction = await this.sendPayment(payments, secretKey, true);
    if (typeof transaction === 'string') {
      return transaction;
    }
    const { max = BASE_FEE } = await this.serverService.getFees();

    const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
      Keypair.fromSecret(secretKey),
      max,
      transaction,
      Networks[this.options.mode || StellarModuleMode.TESTNET],
    );
    feeBumpTx.sign(Keypair.fromSecret(secretKey));
    await this.serverService.submitTransaction(feeBumpTx);

    return transaction.hash().toString('hex');
  }

  public async swapPayment(sender: TSender, recipient: TSender, memo: string | number | Uint8Array) {
    try {
      const { max = BASE_FEE } = await this.serverService.getFees();
      const [sourcePair, sourceAccount] = await this.accountUtilsService.getAccountFromSecret(sender.secretKey);

      const sendAssetTransaction = new TransactionBuilder(sourceAccount, {
        fee: max,
        networkPassphrase: Networks[this.options.mode || StellarModuleMode.TESTNET],
      });

      const senderAsset = this.getAsset(sender.asset);
      const recipientAsset = this.getAsset(recipient.asset);

      if (!this.paymentUtilsService.validateAssetBalance(sender.secretKey, senderAsset, sender.amount)) {
        return false;
      }

      sendAssetTransaction.addOperation(
        Operation.payment({
          asset: senderAsset,
          amount: sender.amount.toString(),
          destination: Keypair.fromSecret(recipient.secretKey).publicKey(),
        }),
      );

      sendAssetTransaction.addOperation(
        Operation.payment({
          source: Keypair.fromSecret(recipient.secretKey).publicKey(),
          asset: recipientAsset,
          amount: recipient.amount.toString(), // B envía sendAmount
          destination: Keypair.fromSecret(sender.secretKey).publicKey(),
        }),
      );

      if (memo) {
        sendAssetTransaction.addMemo(this.paymentUtilsService.validateMemo(memo));
      }

      const transaction = sendAssetTransaction.setTimeout(30).build();
      transaction.sign(sourcePair);
      transaction.sign(Keypair.fromSecret(recipient.secretKey));

      await this.serverService.submitTransaction(transaction);
      return true;
    } catch (e) {
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
