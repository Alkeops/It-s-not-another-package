import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StellarModule } from '@app/stellar-nest';
import { USDC } from '@app/stellar-nest/enums';
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
        account: {
          create: {
            by: 'OWNER',
            starting: {
              balance: '1',
              baseTrustline: [USDC],
            },
          },
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
            /* ...accounts */
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
