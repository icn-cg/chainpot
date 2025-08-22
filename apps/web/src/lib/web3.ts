'use client';
import { BrowserProvider, Contract, JsonRpcProvider } from 'ethers';
import { poolFactoryAbi, poolEscrowAbi, erc20Abi } from './abi';
import { toNumberSafe } from './numeric';

/** ---------- ENV ---------- */
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || '80002');
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology';

// Pool architecture contracts
export const POOL_FACTORY = process.env.NEXT_PUBLIC_POOL_FACTORY_ADDRESS!;
export const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS!;
export const POOL_USDC = USDC_ADDRESS;
export const FEE_COLLECTOR = process.env.NEXT_PUBLIC_FEE_COLLECTOR_ADDRESS;

/** ---------- RPC ---------- */
export function rpc() {
  return new JsonRpcProvider(RPC_URL, CHAIN_ID);
}
const chainHex = () => '0x' + CHAIN_ID.toString(16);

/** ---------- Injected (MetaMask / Coinbase Wallet) ---------- */
export async function connectInjected(): Promise<BrowserProvider> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('No injected wallet found. Install/enable MetaMask or Coinbase Wallet.');
  }
  const ethereum = (window as any).ethereum;

  const need = chainHex();
  let current: string = await ethereum.request({ method: 'eth_chainId' });
  if (current !== need) {
    try {
      await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: need }] });
    } catch (err: any) {
      if (err?.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: need,
              chainName: 'Polygon Amoy',
              nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
              rpcUrls: [RPC_URL],
              blockExplorerUrls: ['https://www.oklink.com/amoy'],
            },
          ],
        });
      } else {
        throw err;
      }
    }
    current = await ethereum.request({ method: 'eth_chainId' });
    if (current !== need) throw new Error('Please switch your wallet to Polygon Amoy (80002).');
  }

  const provider = new BrowserProvider(ethereum);
  ethereum.removeAllListeners?.('chainChanged');
  ethereum.on?.('chainChanged', () => window.location.reload());
  await ethereum.request({ method: 'eth_requestAccounts' });
  return provider;
}

/** ---------- Chain guard for any EIP-1193 -> BrowserProvider ---------- */
export async function ensureChain(provider: BrowserProvider) {
  const net = await provider.getNetwork();
  if (toNumberSafe(net.chainId) !== CHAIN_ID) {
    const hexId = chainHex();
    try {
      await (provider as any).send('wallet_switchEthereumChain', [{ chainId: hexId }]);
    } catch {
      await (provider as any).send('wallet_addEthereumChain', [
        {
          chainId: hexId,
          chainName: 'Polygon Amoy',
          nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
          rpcUrls: [RPC_URL],
          blockExplorerUrls: ['https://www.oklink.com/amoy'],
        },
      ]);
    }
  }
}

/** ---------- Utils ---------- */
export async function signerAddress(provider: BrowserProvider) {
  const s = await provider.getSigner();
  return await s.getAddress();
}

/** ---------- READ contracts (Provider) ---------- */
export function poolFactoryReadonly() {
  return new Contract(POOL_FACTORY, poolFactoryAbi, rpc());
}
export function poolEscrowReadonly(addr: string) {
  return new Contract(addr, poolEscrowAbi, rpc());
}
export function erc20Readonly(addr: string = USDC_ADDRESS) {
  return new Contract(addr, erc20Abi, rpc());
}

/** ---------- WRITE contracts (Signer) ---------- */
export async function poolFactoryWrite(provider: BrowserProvider) {
  const signer = await provider.getSigner();
  return new Contract(POOL_FACTORY, poolFactoryAbi, signer);
}
export async function poolEscrowWrite(addr: string, provider: BrowserProvider) {
  const signer = await provider.getSigner();
  return new Contract(addr, poolEscrowAbi, signer);
}
export async function erc20Write(provider: BrowserProvider, addr: string = USDC_ADDRESS) {
  const signer = await provider.getSigner();
  return new Contract(addr, erc20Abi, signer);
}

/** ---------- 6-dec helpers (USDC) ---------- */
export function toUnits6(amount: string): bigint {
  const [i, d = ''] = amount.trim().split('.');
  const di = d.slice(0, 6).padEnd(6, '0');
  const sign = i.startsWith('-') ? -1n : 1n;
  const ii = BigInt(i || '0');
  const dd = BigInt(di || '0');
  return sign * (ii * 1_000_000n + dd);
}
export function fromUnits6(n: bigint): string {
  const sign = n < 0n ? '-' : '';
  const x = n < 0n ? -n : n;
  const i = x / 1_000_000n;
  const d = (x % 1_000_000n).toString().padStart(6, '0');
  return `${sign}${i}.${d}`;
}
export function toUnixTs(dateStr: string): bigint {
  const ms = new Date(dateStr).getTime();
  return BigInt(Math.floor(ms / 1000));
}
