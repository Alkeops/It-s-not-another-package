<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

> :warning: **Preliminary development stage. Not for production use**. Be careful!

## Table of Contents

- [Description](#description)
  - [Why use cases?](#why-use-cases)
- [Installation](#installation)
- [Configure](#configure)
- [Decorators](#decorators)
- [Services](#services)

## Description

### Motivation

Stellar Nest provides an easy way to kickstart a project in Stellar with Nest. It offers a series of decorators and specific functions based on use cases, while also being fully configurable to align with the development requirements, making it particularly useful for the following scenarios:

##### MVP

In the MVP realm, where rapid Stellar adoption is crucial, Stellar Nest accelerates integration for small teams. Simplifying processes and functionalities, it expedites development cycles, empowering teams to focus on innovation. This minimizes blockchain complexities, facilitating a seamless transition to leveraging the Stellar network.

##### Non-blockchain developers

Stellar Nest bridges Stellar adoption for non-blockchain developers, with intuitive features and seamless integration. Its developer-friendly design enables effortless integration, fostering wider Stellar adoption across diverse developer communities.

##### Proof of concepts

Stellar Nest's accessibility makes it ideal for rapid prototyping. Simplifying feature integration, it empowers developers to explore and validate ideas efficiently. With its user-centric design, teams can expedite development and test new concepts within short timeframes.

##### Non-blockchain projects or small teams

Stellar Nest offers effortless integration for non-blockchain projects, eliminating the need for extensive blockchain expertise. Its user-friendly approach facilitates swift Stellar integration, enabling customized developments without steep learning curves.

### Why Use Cases?

This package will be centered around use cases rather than small functionalities, with a general focus on accelerating small-scale developments.

##### Clarity in Requirements:

Working with use cases enables a clear understanding of what is expected to occur within the system in specific situations.

##### Simplicity and Clarity:

Working with use cases simplifies the understanding of what is being done, facilitating communication between developers and stakeholders, who may or may not be developers.

##### Better Developer Experience:

Prioritizing ease of use and the ability to solve specific problems over the intricacies of implementation is emphasized when working with use cases.

#### A little example with Create Account Use Case

Taking the [documentation](https://developers.stellar.org/docs/tutorials/create-account) as an example for creating an account, let's consider a snippet of a real conversation. Imagine for a moment a developer from a small startup whose next task is very simple: creating an account. The Stellar process isn't complex; in fact, it's very well-explained. However, the programmer is more interested in the **'WHAT?'** than the **'HOW?'**, especially when time is of the essence.

##### Step 1

Generate your own keypair

```ts
// create a completely new and unique pair of keys
// see more about KeyPair objects: https://stellar.github.io/js-stellar-sdk/Keypair.html
const pair = StellarSdk.Keypair.random();

pair.secret();
// SAV76USXIJOBMEQXPANUOQM6F5LIOTLPDIDVRJBFFE2MDJXG24TAPUU7
pair.publicKey();
// GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB
```

##### Step 2

The accounts don't exist unless they have a minimum balance of 1 XLM; you can use the friendbot. Obviously, you need funds in some account to then create accounts from it

```ts
// The SDK does not have tools for creating test accounts, so you'll have to
// make your own HTTP request.

// if you're trying this on Node, install the `node-fetch` library and
// uncomment the next line:
// const fetch = require('node-fetch');

(async function main() {
  try {
    const response = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(pair.publicKey())}`);
    const responseJSON = await response.json();
    console.log('SUCCESS! You have a new account :)\n', responseJSON);
  } catch (e) {
    console.error('ERROR!', e);
  }
  // After you've got your test lumens from friendbot, we can also use that account to create a new account on the ledger.
  try {
    const server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
    var parentAccount = await server.loadAccount(pair.publicKey()); //make sure the parent account exists on ledger
    var childAccount = StellarSdk.Keypair.random(); //generate a random account to create
    //create a transacion object.
    var createAccountTx = new StellarSdk.TransactionBuilder(parentAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    });
    //add the create account operation to the createAccountTx transaction.
    createAccountTx = await createAccountTx
      .addOperation(
        StellarSdk.Operation.createAccount({
          destination: childAccount.publicKey(),
          startingBalance: '5',
        }),
      )
      .setTimeout(180)
      .build();
    //sign the transaction with the account that was created from friendbot.
    await createAccountTx.sign(pair);
    //submit the transaction
    let txResponse = await server
      .submitTransaction(createAccountTx)
      // some simple error handling
      .catch(function (error) {
        console.log('there was an error');
        console.log(error.response);
        console.log(error.status);
        console.log(error.extras);
        return error;
      });
    console.log(txResponse);
    console.log('Created the new account', childAccount.publicKey());
  } catch (e) {
    console.error('ERROR!', e);
  }
})();
```

#### stellar-nest

After configuring the module, the developer only needs one line, and all the work is done by stellar-nest in the background. If they don't specify a creator account and the mode is 'TESTNET,' a new account will automatically be created and funded using the friendbot. The developer fulfills their primary goal, the **'WHAT?'** Now they can read a bit about the **'HOW?'**

```js
  async createAccountWithStellarNest() {
    const newPair = await this.accountService.createAccount();
    /* other things to do  */
    return otherThing;
  }
```

In some use cases, it's common to start an account with a ready trustline (for example, a stablecoin). That's why stellar-nest, starting from the module configuration, allows you to add an array of 'code:issuer' to automatically establish those trustlines. Additionally, developers can also decide from the module whether they want the accounts to be Sponsored or not.

Furthermore, at any point, the developer may opt not to use the initial configuration but to provide specific configuration through function parameters. For instance, the developer might want a specific account to create another one because it's a different flow in their application. This could be achieved simply by passing the secret key.

```js
  async createAccountWithStellarNest() {
    const newPair = await this.accountService.createAccount('THISISA100%TRUSTSECRETKEY');
    /* other things to do  */
    return otherThing;
  }
```

#### What about future?

This is a small preview of things that should be possible to do.

##### Setting up alerts.

The developer might want to have special alerts, such as when one of the main accounts is running low on funds.

##### Event-driven workflow.

In some situations, it is preferable not to interact directly with Stellar responses (such as account creation) and instead work on an event-driven basis. This means that when the goal of the method is reached, a particular service of the developer can be triggered.

```js
    /* The first file  */
  async createAccountWithStellarNest() {

    this.accountService.createAccount();

    let i = 1n;
    let x = 3n * (10n ** 1020n);
    let pi = x;
    while (x > 0) {
            x = x * i / ((i + 1n) * 4n);
            pi += x / (i + 2n);
            i += 2n;
    }

    const doSomething = await businessLogicRelated();
    return otherThing;
  }

  /* Other file or space */
  @OnEvent(ACCOUNT.CREATE)
  async myOtherBeautifulMethod(payload: Account) {
    /* other things to do  */
    return otherThing;
  }
```

##### OtherServices

Creation of new services exposed to the developer to satisfy various use cases, such as payments, assets, covering actions for both custodial and non-custodial accounts, and more.

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

#### Examples:

##### Before

```js
 async createAccountWithoutStellarNest() {

    const server = new Horizon.Server('https://horizon-testnet.stellar.org');
    const newPair = Keypair.random();
    const parentPair = Keypair.fromSecret(this.configService.get('PARENT_ACCOUNT_SECRET'));
    const parentAccount = await server.loadAccount(parentPair.publicKey());
    const transaction = new TransactionBuilder(parentAccount, {
      fee: BASE_FEE,
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

    return otherThing;
  }
```

##### After

```js
  async createAccountWithStellarNest() {
    const newPair = await this.accountService.createAccount();
    /* other things to do  */
    return otherThing;
  }
```

##### Why?

This package is associated with use cases; therefore, creating the account already performs everything necessary for an account to exist on the Stellar network. Additionally, with the module configuration, initial trustlines could be added if desired, along with some other configurations.

# Under Construction :construction:
