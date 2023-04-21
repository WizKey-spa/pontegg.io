import { JsonRpcProvider } from '@ethersproject/providers';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers, Wallet } from 'ethers';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class WalletProvider {
  private readonly provider: JsonRpcProvider;
  private readonly wallet: Wallet;

  constructor(
    @InjectPinoLogger(WalletProvider.name) private readonly logger: PinoLogger,
    @Inject(ConfigService) conf: ConfigService,
  ) {
    this.provider = new ethers.providers.JsonRpcProvider(conf.get('BLOCKCHAIN_ENDPOINT'));
    this.wallet = new ethers.Wallet(conf.get('BLOCKCHAIN_PRIVATE_KEY'));
    this.logger.setContext(WalletProvider.name);
    this.logger.debug('Blockchain module configured');
  }

  async getProvider() {
    return this.provider;
  }

  async getWallet() {
    return this.wallet;
  }

  async getConnectedWallet() {
    return await this.wallet.connect(this.provider);
  }
}
