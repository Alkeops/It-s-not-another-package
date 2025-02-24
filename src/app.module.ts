import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StellarModule } from '@app/stellar-nest';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    EventEmitterModule.forRoot({
      /* Add some conf */
    }),
    StellarModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        assets: {
          create: {
            by: 'ISSUER',
            distributorAccount: 'OWNER',
          },
        },
        account: {
          create: {
            by: 'OWNER',
            starting: {
              balance: '2',
              baseTrustline: [config.get('OTHER_ASSET')],
            },
          },
          accounts: [
            {
              public: config.get('PARENT_ACCOUNT_PUBLIC'),
              secret: config.get('PARENT_ACCOUNT_SECRET'),
              type: 'ISSUER',
              signers: [
                {
                  public: config.get('ACCOUNT_SIGNER_PUBLIC'),
                  secret: config.get('ACCOUNT_SIGNER_SECRET'),
                  type: 'SIGNER',
                },
                {
                  public: config.get('ACCOUNT_SIGNER2_PUBLIC'),
                  secret: config.get('ACCOUNT_SIGNER2_SECRET'),
                  type: 'SIGNER',
                },
                {
                  public: config.get('ACCOUNT_SIGNER3_PUBLIC'),
                  secret: config.get('ACCOUNT_SIGNER3_SECRET'),
                  type: 'SIGNER',
                },
                {
                  public: config.get('ACCOUNT_SIGNER4_PUBLIC'),
                  secret: config.get('ACCOUNT_SIGNER4_SECRET'),
                  type: 'SIGNER',
                },
              ],
            },
            {
              public: config.get('OWNER_ACCOUNT_PUBLIC'),
              secret: config.get('OWNER_ACCOUNT_SECRET'),
              type: 'OWNER',
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
export class AppModule {}
