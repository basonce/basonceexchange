import { createConfig, http } from 'wagmi';
import { bscTestnet, polygonMumbai, bsc, polygon } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [bscTestnet, polygonMumbai, bsc, polygon],
  connectors: [
    injected(),
  ],
  transports: {
    [bscTestnet.id]: http('https://data-seed-prebsc-1-s1.binance.org:8545'),
    [polygonMumbai.id]: http('https://rpc-mumbai.maticvigil.com'),
    [bsc.id]: http('https://bsc-dataseed1.binance.org'),
    [polygon.id]: http('https://polygon-rpc.com'),
  },
});
