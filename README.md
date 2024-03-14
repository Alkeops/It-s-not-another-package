<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>
<p align="center">
  <a href="https://stellar.org/" target="blank"><img src="https://cdn.sanity.io/images/e2r40yh6/production/502d9b1bbee8c2169cc0eb3d0982ba3bf02ce300-1776x548.png?w=1440&auto=format" width="200" alt="Nest Logo" /></a>
</p>

> :warning: **Preliminary development stage. Not for production use**. Be careful!

## Table of Contents

- [Description](#description)
- [Installation](#installation)
- [Configure](#configure)
- [Decorators](#decorators)
- [Services](#services)

## Description

Stellar Nest provides an easy way to kickstart a project in Stellar with Nest. It offers a series of decorators and specific functions based on use cases, while also being fully configurable to align with the development requirement.

## Installation

```bash
$ npm install
```

## Running the app

```bash
$ npm run start:dev
```

## Build

```bash
$ npm run build:lib
```

With this build, you can use it to work locally and test the library.

## Configure

### Synchronously

```ts
@Module({
  imports: [
    StellarModule.forRoot({
      account: {
        create: {
          by: 'ISSUER',
          starting: {
            balance: '8',
            baseTrustline: [USDC],
          },
        },
        accounts: [
          {
            public: publicKey,
            secret: secretKey,
            type: 'ISSUER',
          },
        ],
      },
      mode: 'TESTNET',
    }),
  ],
})
export class AppModule {}
```

### Asynchronously

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    StellarModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        account: {
          create: {
            by: 'ISSUER',
            starting: {
              balance: '8',
              baseTrustline: [USDC],
            },
          },
          accounts: [
            {
              public: config.get('PARENT_ACCOUNT_PUBLIC'),
              secret: config.get('PARENT_ACCOUNT_SECRET'),
              type: 'ISSUER',
            },
          ],
        },
        mode: 'TESTNET',
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
```

## Decorators

### BalanceParam

A decorator enabling the retrieval of an account balance from the Stellar network based on a route parameter or request header. It allows specifying whether to retrieve all balances or the balance of a particular asset.

```ts
 @Get(':id')
  async getNews(
    BalanceParam('id') balance: BalanceType
  ): Promise<any> {
    console.log(balance)
  }
```

### AccountParam

Get account from the Stellar network

```ts
 @Get(':id')
  async getNews(
    AccountParam('id') account: AccountResponse
  ): Promise<any> {
    console.log(account)
  }
```

### CreateTestAccount

Create a test account, fund it with friendbot, and return the Keypair.

```ts
 @Get(':id')
  async getNews(
    CreateTestAccount('id') pair: Keypair
  ): Promise<any> {
    console.log(pair)
  }
```

## Services

Thanks to our initial module configuration, users can leverage all the predefined setup within services for their use

### AccountService

Account creation based on module pre-configuration
```js
  async createAccountWithStellarNest() {
    const newPair = await this.accountService.createAccount();
    /* other things to do  */
    return otherThing;
  }
```

# Under Construction :construction:
