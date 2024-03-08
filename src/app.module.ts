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
export class AppModule {}
