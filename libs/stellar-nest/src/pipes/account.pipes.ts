import { ArgumentMetadata, Inject, Injectable, PipeTransform, forwardRef } from '@nestjs/common';
import { AccountService} from '../providers';
import { Request } from 'express';
import { AccountResponse, HorizonApi } from '@stellar/stellar-sdk/lib/horizon';
import { AccessorTypeEnum } from '../enums';
import { STELLAR_NATIVE } from '../constants';

type Metadata = ArgumentMetadata & {
  data: {
    accessor: 'headers' | 'params' | 'body'; /* TODO add common type */
    assetCode: string;
    name: string;
    type: AccessorTypeEnum;
  };
};

@Injectable()
export class AccountPipe implements PipeTransform {
  constructor(
    @Inject(forwardRef(() => AccountService))
    private readonly AccountService: AccountService,
  ) {}
  async transform(value: Request, metadata: Metadata): Promise<Record<string, any>[] | AccountResponse | HorizonApi.BalanceLine[] | null> {
    const { accessor = null, assetCode = null, name, type = null } = metadata.data;
    
    const accountId = (value[accessor]?.[name] || value.params[name]) as string; 
  
    let account = await this.AccountService.getAccount(accountId);
    if (!type || type === AccessorTypeEnum.DATA || !account) return account;

    let balance : any = account.balances;
    if (assetCode && type === AccessorTypeEnum.BALANCE) {
      balance = [balance.find((b) => assetCode === STELLAR_NATIVE ? (b.asset_type === assetCode) : (b.asset_code === assetCode))];
    }
    return balance as HorizonApi.BalanceLine[];
  }
}
