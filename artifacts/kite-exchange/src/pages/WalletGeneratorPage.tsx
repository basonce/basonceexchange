import { useState, useRef } from 'react';
import { ethers } from 'ethers';

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function hexToUint8Array(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return arr;
}

function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

function sha256Pure(data: Uint8Array): Uint8Array {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const msgLen = data.length;
  const bitLen = msgLen * 8;
  const padLen = msgLen % 64 < 56 ? 56 - (msgLen % 64) : 120 - (msgLen % 64);
  const totalLen = msgLen + padLen + 8;
  const padded = new Uint8Array(totalLen);
  padded.set(data);
  padded[msgLen] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(totalLen - 4, bitLen & 0xffffffff, false);
  view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000), false);

  const w = new Uint32Array(64);
  for (let offset = 0; offset < totalLen; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }

  const result = new Uint8Array(32);
  const rv = new DataView(result.buffer);
  rv.setUint32(0, h0, false); rv.setUint32(4, h1, false);
  rv.setUint32(8, h2, false); rv.setUint32(12, h3, false);
  rv.setUint32(16, h4, false); rv.setUint32(20, h5, false);
  rv.setUint32(24, h6, false); rv.setUint32(28, h7, false);
  return result;
}

function formatTRC20Address(ethAddress: string): string {
  const hex = ethAddress.slice(2);
  const tronHex = '41' + hex;
  const payload = hexToUint8Array(tronHex);
  const hash1 = sha256Pure(payload);
  const hash2 = sha256Pure(hash1);
  const checksum = hash2.slice(0, 4);
  const full = new Uint8Array([...payload, ...checksum]);
  let num = BigInt('0x' + uint8ArrayToHex(full));
  let encoded = '';
  while (num > 0n) {
    const remainder = num % 58n;
    num = num / 58n;
    encoded = BASE58_ALPHABET[Number(remainder)] + encoded;
  }
  for (let i = 0; i < full.length && full[i] === 0; i++) encoded = '1' + encoded;
  return encoded;
}

type WalletEntry = { address: string; privateKey: string };
type GenerationStatus = 'idle' | 'generating' | 'done';

type TestResult = {
  bep20: {
    address: string;
    privateKey: string;
    derivedAddress: string;
    match: boolean;
    startsWithZeroX: boolean;
    keyLength: number;
    addressLength: number;
    startsWithZero: boolean;
  };
  trc20: {
    address: string;
    privateKey: string;
    derivedAddress: string;
    match: boolean;
    startsWithZeroX: boolean;
    keyLength: number;
    addressLength: number;
    startsWithT: boolean;
    tronHexPayload: string;
  };
};

export default function WalletGeneratorPage() {
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [progress, setProgress] = useState({ bep20: 0, trc20: 0 });
  const [bep20Done, setBep20Done] = useState(false);
  const [trc20Done, setTrc20Done] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [bep20Wallets, setBep20Wallets] = useState<WalletEntry[]>([]);
  const [trc20Wallets, setTrc20Wallets] = useState<WalletEntry[]>([]);
  const [bep20Downloaded, setBep20Downloaded] = useState(false);
  const [trc20Downloaded, setTrc20Downloaded] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testRunning, setTestRunning] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const clearAllData = () => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setBep20Wallets([]);
    setTrc20Wallets([]);
    setBep20Done(false);
    setTrc20Done(false);
    setBep20Downloaded(false);
    setTrc20Downloaded(false);
    setStatus('idle');
    setProgress({ bep20: 0, trc20: 0 });
    setLogs([]);
  };

  const runLiveTest = () => {
    setTestRunning(true);
    setTestResult(null);

    try {
      const master = ethers.Wallet.createRandom();
      const seed = master.mnemonic!.phrase;

      const bep20Child = ethers.HDNodeWallet.fromPhrase(seed, undefined, `m/44'/60'/0'/0/0`);
      const bep20Pk = bep20Child.privateKey.startsWith('0x') ? bep20Child.privateKey : `0x${bep20Child.privateKey}`;
      const bep20Derived = new ethers.Wallet(bep20Pk).address;
      const bep20Match = bep20Derived.toLowerCase() === bep20Child.address.toLowerCase();

      const trc20Child = ethers.HDNodeWallet.fromPhrase(seed, undefined, `m/44'/195'/0'/0/0`);
      const trc20Pk = trc20Child.privateKey.startsWith('0x') ? trc20Child.privateKey : `0x${trc20Child.privateKey}`;
      const trc20Address = formatTRC20Address(trc20Child.address);
      const trc20Rederived = formatTRC20Address(new ethers.Wallet(trc20Pk).address);
      const trc20Match = trc20Rederived === trc20Address;
      const trc20HexPayload = '41' + trc20Child.address.slice(2);

      setTestResult({
        bep20: {
          address: bep20Child.address,
          privateKey: bep20Pk,
          derivedAddress: bep20Derived,
          match: bep20Match,
          startsWithZeroX: bep20Pk.startsWith('0x'),
          keyLength: bep20Pk.length,
          addressLength: bep20Child.address.length,
          startsWithZero: bep20Child.address.startsWith('0x'),
        },
        trc20: {
          address: trc20Address,
          privateKey: trc20Pk,
          derivedAddress: trc20Rederived,
          match: trc20Match,
          startsWithZeroX: trc20Pk.startsWith('0x'),
          keyLength: trc20Pk.length,
          addressLength: trc20Address.length,
          startsWithT: trc20Address.startsWith('T'),
          tronHexPayload: trc20HexPayload,
        },
      });
    } catch (err: any) {
      setLogs(prev => [...prev, `Test hatasi: ${err.message}`]);
    }

    setTestRunning(false);
  };

  const startGeneration = () => {
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    setStatus('generating');
    setBep20Done(false);
    setTrc20Done(false);
    setBep20Downloaded(false);
    setTrc20Downloaded(false);
    setProgress({ bep20: 0, trc20: 0 });
    setLogs([]);
    setBep20Wallets([]);
    setTrc20Wallets([]);

    const worker = new Worker(
      new URL('../workers/wallet-generator.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const { type, count, wallets } = e.data;

      if (type === 'bep20_progress') {
        setProgress(prev => ({ ...prev, bep20: count }));
        if (count % 1000 === 0 || count === 25000) {
          addLog(`BEP20: ${count.toLocaleString()} / 25.000 uretildi`);
        }
      } else if (type === 'bep20_done') {
        setBep20Wallets(wallets);
        setBep20Done(true);
        setProgress(prev => ({ ...prev, bep20: 25000 }));
        addLog(`BEP20 tamamlandi: 25.000 cuzdan`);
        addLog('TRC20 (TRON) cuzdan uretimi basliyor...');
        worker.postMessage({ type: 'generate_trc20', count: 25000 });
      } else if (type === 'trc20_progress') {
        setProgress(prev => ({ ...prev, trc20: count }));
        if (count % 1000 === 0 || count === 25000) {
          addLog(`TRC20: ${count.toLocaleString()} / 25.000 uretildi`);
        }
      } else if (type === 'trc20_done') {
        setTrc20Wallets(wallets);
        setTrc20Done(true);
        setProgress(prev => ({ ...prev, trc20: 25000 }));
        addLog(`TRC20 tamamlandi: 25.000 cuzdan`);
        addLog('Tum cuzdanlar hazir! Her dosyayi indirdikten sonra veriler bellekten silinir.');
        setStatus('done');
        worker.terminate();
        workerRef.current = null;
      }
    };

    worker.onerror = (err) => {
      addLog(`Hata: ${err.message}`);
      setStatus('idle');
      worker.terminate();
      workerRef.current = null;
    };

    addLog('BEP20 (BSC) cuzdan uretimi basliyor...');
    worker.postMessage({ type: 'generate_bep20', count: 25000 });
  };

  const downloadBEP20 = () => {
    const lines = ['address,private_key', ...bep20Wallets.map(w => {
      const pk = w.privateKey.startsWith('0x') ? w.privateKey : `0x${w.privateKey}`;
      return `${w.address},${pk}`;
    })];
    downloadCSV(lines.join('\n'), 'bep20_25000_with_keys.csv');
    setBep20Wallets([]);
    setBep20Downloaded(true);
    addLog('BEP20 indirildi ve bellekten silindi.');
  };

  const downloadTRC20 = () => {
    const lines = ['address,private_key', ...trc20Wallets.map(w => {
      const pk = w.privateKey.startsWith('0x') ? w.privateKey : `0x${w.privateKey}`;
      return `${w.address},${pk}`;
    })];
    downloadCSV(lines.join('\n'), 'trc20_25000_with_keys.csv');
    setTrc20Wallets([]);
    setTrc20Downloaded(true);
    addLog('TRC20 indirildi ve bellekten silindi.');
  };

  const bep20Pct = Math.round((progress.bep20 / 25000) * 100);
  const trc20Pct = Math.round((progress.trc20 / 25000) * 100);
  const allDownloaded = bep20Downloaded && trc20Downloaded;

  const allTestsPass = testResult
    ? testResult.bep20.match &&
      testResult.bep20.startsWithZeroX &&
      testResult.bep20.startsWithZero &&
      testResult.trc20.match &&
      testResult.trc20.startsWithZeroX &&
      testResult.trc20.startsWithT
    : false;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Cuzdan Uretici</h1>
          <p className="text-gray-400 text-sm">50.000 adet kripto cuzdan + private key uret ve CSV olarak indir</p>
        </div>

        {/* CANLI TEST PANELI */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold text-white text-sm">Canli Dogrulama Testi</div>
              <div className="text-xs text-gray-500 mt-0.5">Uretmeden once 1 ornek cuzdan uretip key-adres eslesmesini dogrula</div>
            </div>
            <button
              onClick={runLiveTest}
              disabled={testRunning}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {testRunning ? (
                <>
                  <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
                  Test ediliyor...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Test Baslat
                </>
              )}
            </button>
          </div>

          {testResult && (
            <div className="space-y-3">
              <div className={`rounded-xl p-3 border ${allTestsPass ? 'bg-emerald-900/20 border-emerald-700/40' : 'bg-red-900/20 border-red-700/40'}`}>
                <div className={`text-sm font-semibold mb-1 ${allTestsPass ? 'text-emerald-400' : 'text-red-400'}`}>
                  {allTestsPass ? 'TUM TESTLER BASARILI — Sistem dogru calisiyor' : 'BAZI TESTLER BASARISIZ — Uretim yapmayin!'}
                </div>
              </div>

              {/* BEP20 TEST */}
              <div className="bg-gray-800 rounded-xl p-3">
                <div className="text-xs font-semibold text-blue-400 mb-2 uppercase tracking-wider">BEP20 / MetaMask / Trust Wallet</div>
                <div className="space-y-1.5">
                  <TestRow
                    label="Adres 0x ile baslıyor mu?"
                    value={testResult.bep20.startsWithZero ? 'EVET' : 'HAYIR'}
                    pass={testResult.bep20.startsWithZero}
                  />
                  <TestRow
                    label="Private key 0x ile baslıyor mu?"
                    value={testResult.bep20.startsWithZeroX ? 'EVET' : 'HAYIR'}
                    pass={testResult.bep20.startsWithZeroX}
                  />
                  <TestRow
                    label="Key uzunlugu (66 olmali)"
                    value={`${testResult.bep20.keyLength} karakter`}
                    pass={testResult.bep20.keyLength === 66}
                  />
                  <TestRow
                    label="Adres uzunlugu (42 olmali)"
                    value={`${testResult.bep20.addressLength} karakter`}
                    pass={testResult.bep20.addressLength === 42}
                  />
                  <TestRow
                    label="Key'den adres turetilince eslesiyor mu?"
                    value={testResult.bep20.match ? 'EVET — eslesme dogru' : 'HAYIR — HATA!'}
                    pass={testResult.bep20.match}
                  />
                  <div className="pt-1 border-t border-gray-700 mt-1">
                    <div className="text-xs text-gray-500 mb-0.5">Ornek adres:</div>
                    <div className="text-xs text-gray-300 font-mono break-all">{testResult.bep20.address}</div>
                    <div className="text-xs text-gray-500 mt-1 mb-0.5">Ornek private key:</div>
                    <div className="text-xs text-gray-300 font-mono break-all">{testResult.bep20.privateKey}</div>
                  </div>
                </div>
              </div>

              {/* TRC20 TEST */}
              <div className="bg-gray-800 rounded-xl p-3">
                <div className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wider">TRC20 / TRON / Trust Wallet</div>
                <div className="space-y-1.5">
                  <TestRow
                    label="Adres T ile baslıyor mu? (TRON zorunlu)"
                    value={testResult.trc20.startsWithT ? 'EVET' : 'HAYIR — BOZUK!'}
                    pass={testResult.trc20.startsWithT}
                  />
                  <TestRow
                    label="Private key 0x ile baslıyor mu?"
                    value={testResult.trc20.startsWithZeroX ? 'EVET' : 'HAYIR'}
                    pass={testResult.trc20.startsWithZeroX}
                  />
                  <TestRow
                    label="Key uzunlugu (66 olmali)"
                    value={`${testResult.trc20.keyLength} karakter`}
                    pass={testResult.trc20.keyLength === 66}
                  />
                  <TestRow
                    label="Adres uzunlugu (34 olmali)"
                    value={`${testResult.trc20.addressLength} karakter`}
                    pass={testResult.trc20.addressLength === 34}
                  />
                  <TestRow
                    label="Key'den adres turetilince eslesiyor mu?"
                    value={testResult.trc20.match ? 'EVET — eslesme dogru' : 'HAYIR — HATA!'}
                    pass={testResult.trc20.match}
                  />
                  <div className="pt-1 border-t border-gray-700 mt-1">
                    <div className="text-xs text-gray-500 mb-0.5">Ornek TRON adresi:</div>
                    <div className="text-xs text-gray-300 font-mono break-all">{testResult.trc20.address}</div>
                    <div className="text-xs text-gray-500 mt-1 mb-0.5">Ornek private key:</div>
                    <div className="text-xs text-gray-300 font-mono break-all">{testResult.trc20.privateKey}</div>
                    <div className="text-xs text-gray-500 mt-1 mb-0.5">Ham TRON hex payload (41 ile baslamali):</div>
                    <div className="text-xs text-gray-400 font-mono break-all">{testResult.trc20.tronHexPayload.slice(0, 10)}...</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!testResult && (
            <div className="text-center py-4 text-gray-600 text-sm">
              Uretim yapmadan once testi calistir — key ile adresin gercekten eslesiyor oldugunu dogrula
            </div>
          )}
        </div>

        {/* URETIM PANELI */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-white">Uretim Detaylari</div>
              <div className="text-xs text-gray-400">HD Wallet (BIP44) — adres + private key CSV</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-800 rounded-xl p-3">
              <div className="text-xs text-gray-400 mb-1">BEP20 (BSC)</div>
              <div className="text-lg font-bold text-white">25.000</div>
              <div className="text-xs text-gray-500">m/44'/60'/0'/0/i</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-3">
              <div className="text-xs text-gray-400 mb-1">TRC20 (TRON)</div>
              <div className="text-lg font-bold text-white">25.000</div>
              <div className="text-xs text-gray-500">m/44'/195'/0'/0/i</div>
            </div>
          </div>

          {status === 'idle' && (
            <button
              onClick={startGeneration}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
            >
              Uretimi Baslat
            </button>
          )}

          {status === 'generating' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">BEP20</span>
                  <span className="text-gray-400">{progress.bep20.toLocaleString()} / 25.000</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${bep20Pct}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">TRC20</span>
                  <span className="text-gray-400">{progress.trc20.toLocaleString()} / 25.000</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${trc20Pct}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Lutfen bekleyin, arka planda calisiyor...</span>
                <button
                  onClick={clearAllData}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Iptal Et
                </button>
              </div>
            </div>
          )}

          {status === 'done' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold">50.000 cuzdan basariyla uretildi!</span>
              </div>

              <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-3 mb-2">
                <div className="text-xs text-blue-300">
                  Her dosya <span className="font-semibold">address,private_key</span> formatinda. Private keyler <span className="font-semibold">0x</span> prefix ile kaydedildi (MetaMask uyumlu). Indirdikten sonra veriler bellekten otomatik silinir.
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={downloadBEP20}
                  disabled={bep20Downloaded}
                  className={`w-full py-2.5 font-medium rounded-xl transition-colors text-sm flex items-center justify-center gap-2 ${
                    bep20Downloaded
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {bep20Downloaded ? 'BEP20 indirildi (bellekten silindi)' : 'BEP20 — bep20_25000_with_keys.csv indir'}
                </button>

                <button
                  onClick={downloadTRC20}
                  disabled={trc20Downloaded}
                  className={`w-full py-2.5 font-medium rounded-xl transition-colors text-sm flex items-center justify-center gap-2 ${
                    trc20Downloaded
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {trc20Downloaded ? 'TRC20 indirildi (bellekten silindi)' : 'TRC20 — trc20_25000_with_keys.csv indir'}
                </button>
              </div>

              {allDownloaded && (
                <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-xl p-3 text-center">
                  <div className="text-xs text-emerald-300 font-medium">Her iki dosya indirildi. Bellekte hic private key kalmadi.</div>
                </div>
              )}

              <button
                onClick={clearAllData}
                className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
              >
                Yeniden uret
              </button>
            </div>
          )}
        </div>

        {logs.length > 0 && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
            <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Islem Logu</div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="text-xs text-gray-400 font-mono">{log}</div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 bg-amber-900/20 border border-amber-800/40 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-xs text-amber-300/80">
              CSV dosyalari adres ve private key icerir. Indirdikten sonra veriler RAM'den silinir. Admin panelde sadece adres CSV'sini yukle.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TestRow({ label, value, pass }: { label: string; value: string; pass: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-gray-400 flex-1">{label}</span>
      <span className={`text-xs font-semibold flex-shrink-0 flex items-center gap-1 ${pass ? 'text-emerald-400' : 'text-red-400'}`}>
        {pass ? (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        {value}
      </span>
    </div>
  );
}
