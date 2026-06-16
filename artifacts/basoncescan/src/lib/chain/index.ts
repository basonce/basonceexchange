import { ChainDataSource } from './types';
import { MockChainDataSource } from './mock-data';

// TODO: Replace with RealChainDataSource when integrating with actual RPC/API
// export const chainData: ChainDataSource = new RealChainDataSource();
export const chainData: ChainDataSource = new MockChainDataSource();

export * from './types';
