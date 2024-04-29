import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StellarModule } from '@app/stellar-nest';
import { USDC } from '@app/stellar-nest/enums';
import { ConfigModule, ConfigService } from '@nestjs/config';
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    StellarModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        accounts: [
          {
            public: config.get('PARENT_ACCOUNT_PUBLIC'),
            secret: config.get('PARENT_ACCOUNT_SECRET'),
            type: 'ISSUER',
          },
          {
            public: config.get('OWNER_ACCOUNT_PUBLIC'),
            secret: config.get('OWNER_ACCOUNT_SECRET'),
            type: 'OWNER',
          },
        ],
        account: {
          parentAccount: 'ISSUER',
          baseTrustline: [USDC, config.get('OTHER_ASSET')],
          startingBalance: '5',
          homeDomain: 'stellar-nest.com',
          sponsored: 'OWNER'
        },
        mode: 'PUBLIC',
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
