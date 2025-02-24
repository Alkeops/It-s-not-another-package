import { Inject, Injectable, Logger } from '@nestjs/common';
import { Keypair, Transaction } from '@stellar/stellar-sdk';

import { STELLAR_OPTIONS } from '../constants';
import { StellarModuleConfig } from '../types';

@Injectable()
export class SignersService {
  private readonly logger = new Logger('stellar-nest/signer');
  private ownerAccounts: StellarModuleConfig['account']['accounts'];
  constructor(@Inject(STELLAR_OPTIONS) private readonly options: StellarModuleConfig) {
    this.ownerAccounts = this.options.account.accounts || [];
  }

  public getRequiredSigners(transaction: Transaction, extraSigners?: Keypair[]) {
    const signers = new Set<string>();

    transaction.operations.forEach((operation) => {
      const source = operation.source || transaction.source;
      const ownerAccount = this.ownerAccounts.find((account) => account.public === source);

      if (ownerAccount) {
        signers.add(ownerAccount.secret);
        if (ownerAccount.signers) {
          ownerAccount.signers.forEach((signer) => signers.add(signer.secret));
        }
      }
    });

    if (extraSigners) {
      extraSigners.forEach((keypair) => {
        // Verificar si este signer ya está cubierto por las ownerAccounts
        const isAlreadySigner = [...signers].some((secret) => secret === keypair.secret());
        if (!isAlreadySigner) {
          // Verificar si el signer es necesario para alguna de las operaciones
          const signerIsNeeded = transaction.operations.some((operation) => {
            return operation.source === keypair.publicKey() || transaction.source === keypair.publicKey();
          });

          // Si el signer es necesario, lo agregamos
          if (signerIsNeeded) {
            signers.add(keypair.secret());
          }
        }
      });
    }
    return [...Array.from(signers).map((secret) => Keypair.fromSecret(secret))];
  }

  public signTransaction(transaction: Transaction, extraSigners?: Keypair[]) {
    const signers = this.getRequiredSigners(transaction, extraSigners);
    signers.forEach((signer) => transaction.sign(signer));
    return transaction;
  }
}
