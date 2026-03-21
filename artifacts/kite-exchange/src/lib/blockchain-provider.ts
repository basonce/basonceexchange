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
