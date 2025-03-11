import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StellarModule } from '@app/stellar-nest';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    StellarModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        payments: {
          config: {
            create_by: 'ISSUER',
            pay_by: 'DISTRIBUTOR',
            sponsor_by: 'DISTRIBUTOR',
          },
        },
        account: {
          config: {
            create_by: 'DISTRIBUTOR',
            starting: {
              homeDomain: 'stellar-nest',
              balance: '2',
              baseTrustline: [config.get('OTHER_ASSET')],
            },
          },
          accounts: [
            {
              public: 'GDLKFAKOLCXRIIVAJNVIJFQFUZCTR4BOHUDIRE2C2CUBB3KI2PNQEXB3',
              type: 'ISSUER',
              signers: ['APP_SIGNER'],
            },
            {
              public: 'GDM7DRGAV76QKMBVU4PBXSEBAYBLVNWA544GBAHAY5TUQAJBOXKBWNAR',
              type: 'DISTRIBUTOR',
              signers: ['APP_SIGNER'],
            },
            {
              secret: 'SCZ5XWZ3UKEJUNZSMPMWO4DDC7AB2NG2GX2HUYXPPNPR36N2CY357LD6',
              type: 'APP_SIGNER',
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
