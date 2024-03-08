import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { AccessorTypeEnum } from '../enums';
import { AccountPipe } from '../pipes';
import { getRequest } from './utils.decorators';
import { Keypair } from '@stellar/stellar-sdk';

type BalanceParamOptions = {
  accesor?: 'headers' | 'params';
  assetCode: string;
};

export function BalanceParam(name: string): ParameterDecorator;
export function BalanceParam(name: string, options: BalanceParamOptions): ParameterDecorator;
export function BalanceParam(name: string, options?: BalanceParamOptions): ParameterDecorator {
  return getRequest({ name, ...options, type: AccessorTypeEnum.BALANCE }, AccountPipe);
}

export function AccountParam(name: string): ParameterDecorator {
  return getRequest({ name }, AccountPipe);
}

export const CreateKeyPair = createParamDecorator(async (data: unknown, ctx: ExecutionContext) => {
  const pair = Keypair.random();
  return pair;
});

export const CreateTestAccount = createParamDecorator(async (data: unknown, ctx: ExecutionContext) => {
  const newPair = Keypair.random();
  try {
    await fetch(`https://friendbot.stellar.org?addr=${newPair.publicKey()}`);
  } catch (e) {
    throw e;
  }
  return newPair;
});


