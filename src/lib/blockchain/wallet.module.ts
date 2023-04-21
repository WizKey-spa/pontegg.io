import { Module } from '@nestjs/common';
import { WalletProvider } from './WalletProvider';

@Module({
  providers: [WalletProvider],
  exports: [WalletProvider],
})
export class WalletModule {}
