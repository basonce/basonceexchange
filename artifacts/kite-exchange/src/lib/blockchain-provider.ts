import { ethers } from 'ethers';
import { BLOCKCHAIN_NETWORKS, ERC20_ABI, SUPPORTED_TOKENS, type NetworkKey, type TokenSymbol } from './blockchain-config';

class BlockchainProvider {
  private providers: Map<NetworkKey, ethers.JsonRpcProvider> = new Map();

  getProvider(network: NetworkKey): ethers.JsonRpcProvider {
    if (!this.providers.has(network)) {
      const config = BLOCKCHAIN_NETWORKS[network];
      const provider = new ethers.JsonRpcProvider(config.rpcUrl);
      this.providers.set(network, provider);
    }
    return this.providers.get(network)!;
  }

  async getNativeBalance(address: string, network: NetworkKey): Promise<string> {
    const provider = this.getProvider(network);
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  async getTokenBalance(
    address: string,
    token: TokenSymbol,
    network: NetworkKey
  ): Promise<string> {
    const tokenConfig = SUPPORTED_TOKENS[token];
    const tokenAddress = tokenConfig.addresses[network];

    if (!tokenAddress) {
      throw new Error(`Token ${token} not supported on ${network}`);
    }

    const provider = this.getProvider(network);
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const balance = await contract.balanceOf(address);
    return ethers.formatUnits(balance, tokenConfig.decimals);
  }

  async getTransaction(txHash: string, network: NetworkKey) {
    const provider = this.getProvider(network);
    const tx = await provider.getTransaction(txHash);
    const receipt = await provider.getTransactionReceipt(txHash);
    return { tx, receipt };
  }

  async getBlockNumber(network: NetworkKey): Promise<number> {
    const provider = this.getProvider(network);
    return await provider.getBlockNumber();
  }

  async waitForTransaction(
    txHash: string,
    network: NetworkKey,
    confirmations: number = 1
  ) {
    const provider = this.getProvider(network);
    const receipt = await provider.waitForTransaction(txHash, confirmations);
    return receipt;
  }

  async estimateGas(
    from: string,
    to: string,
    value: string,
    network: NetworkKey
  ): Promise<string> {
    const provider = this.getProvider(network);
    const gasEstimate = await provider.estimateGas({
      from,
      to,
      value: ethers.parseEther(value)
    });
    const feeData = await provider.getFeeData();
    const gasCost = gasEstimate * (feeData.gasPrice || BigInt(0));
    return ethers.formatEther(gasCost);
  }

  async estimateTokenTransferGas(
    from: string,
    to: string,
    amount: string,
    token: TokenSymbol,
    network: NetworkKey
  ): Promise<string> {
    const tokenConfig = SUPPORTED_TOKENS[token];
    const tokenAddress = tokenConfig.addresses[network];

    if (!tokenAddress) {
      throw new Error(`Token ${token} not supported on ${network}`);
    }

    const provider = this.getProvider(network);
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

    const amountBigInt = ethers.parseUnits(amount, tokenConfig.decimals);
    const gasEstimate = await contract.transfer.estimateGas(to, amountBigInt);
    const feeData = await provider.getFeeData();
    const gasCost = gasEstimate * (feeData.gasPrice || BigInt(0));

    return ethers.formatEther(gasCost);
  }

  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Coin/network'e göre adres formatını DOĞRU şekilde doğrular.
   * Yanlış format → para kaybı. Asla "0x"'i BTC'ye kabul etme.
   */
  isValidAddressForCoin(address: string, coin: string, network: string): boolean {
    const a = (address || '').trim();
    if (!a) return false;
    const c = (coin || '').toUpperCase();
    const n = (network || '').toUpperCase();

    // EVM zincirleri (ETH, BSC/BEP20, Polygon, Avalanche C-Chain, Arbitrum...)
    const isEvm =
      n === 'ERC20' || n === 'ETH' || n === 'ETHEREUM' ||
      n === 'BEP20' || n === 'BSC' ||
      n === 'POLYGON' || n === 'MATIC' || n === 'POL' ||
      n === 'ARBITRUM' || n === 'OPTIMISM' || n === 'AVAX-C' || n === 'BASE';
    if (isEvm) return /^0x[a-fA-F0-9]{40}$/.test(a);

    // TRON / TRC20 — T ile başlar, 34 karakter Base58
    if (n === 'TRC20' || n === 'TRON' || n === 'TRX') {
      return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a);
    }

    // Bitcoin — bc1 (bech32), 1, 3 ile başlar
    if (c === 'BTC' || n === 'BTC' || n === 'BITCOIN') {
      // bech32 native segwit (bc1q..., bc1p...) — 42-62 char
      if (/^(bc1)[ac-hj-np-z02-9]{6,87}$/.test(a)) return true;
      // legacy P2PKH (1...) ve P2SH (3...) — 26-35 char Base58
      if (/^[13][1-9A-HJ-NP-Za-km-z]{25,34}$/.test(a)) return true;
      return false;
    }

    // Solana — Base58, 32-44 karakter (0, O, I, l YOK)
    if (c === 'SOL' || n === 'SOL' || n === 'SOLANA' || n === 'SPL') {
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a);
    }

    // XRP / Ripple — r ile başlar
    if (c === 'XRP' || n === 'XRP' || n === 'RIPPLE') {
      return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(a);
    }

    // Litecoin
    if (c === 'LTC' || n === 'LTC' || n === 'LITECOIN') {
      if (/^(ltc1)[ac-hj-np-z02-9]{6,87}$/.test(a)) return true;
      if (/^[LM3][1-9A-HJ-NP-Za-km-z]{25,34}$/.test(a)) return true;
      return false;
    }

    // Doge
    if (c === 'DOGE' || n === 'DOGE' || n === 'DOGECOIN') {
      return /^[DA9][1-9A-HJ-NP-Za-km-z]{25,34}$/.test(a);
    }

    // Cardano (ADA) — addr1...
    if (c === 'ADA' || n === 'ADA' || n === 'CARDANO') {
      return /^addr1[ac-hj-np-z02-9]{50,}$/.test(a);
    }

    // Polkadot — 1 ile başlar, ~47 karakter
    if (c === 'DOT' || n === 'DOT' || n === 'POLKADOT') {
      return /^1[a-km-zA-HJ-NP-Z1-9]{46,47}$/.test(a);
    }

    // TON
    if (c === 'TON' || n === 'TON' || n === 'TONCOIN') {
      return /^(EQ|UQ|kQ|0Q)[A-Za-z0-9_-]{46}$/.test(a);
    }

    // Bilinmeyen ağ — güvenli taraf: reddet
    // (Yeni bir coin eklenirse buraya regex eklemek zorunda kalırsın → istenen davranış)
    return false;
  }

  getExplorerUrl(network: NetworkKey, txHash: string): string {
    const config = BLOCKCHAIN_NETWORKS[network];
    return `${config.explorerUrl}/tx/${txHash}`;
  }

  getAddressExplorerUrl(network: NetworkKey, address: string): string {
    const config = BLOCKCHAIN_NETWORKS[network];
    return `${config.explorerUrl}/address/${address}`;
  }

  async listenForDeposits(
    address: string,
    network: NetworkKey,
    callback: (tx: ethers.TransactionResponse) => void
  ) {
    const provider = this.getProvider(network);

    provider.on('block', async (blockNumber) => {
      const block = await provider.getBlock(blockNumber, true);
      if (block && block.transactions) {
        for (const txHash of block.transactions) {
          if (typeof txHash === 'string') {
            const tx = await provider.getTransaction(txHash);
            if (tx && tx.to?.toLowerCase() === address.toLowerCase()) {
              callback(tx);
            }
          }
        }
      }
    });
  }

  async getCurrentGasPrice(network: NetworkKey): Promise<string> {
    const provider = this.getProvider(network);
    const feeData = await provider.getFeeData();
    return ethers.formatUnits(feeData.gasPrice || BigInt(0), 'gwei');
  }
}

export const blockchainProvider = new BlockchainProvider();
