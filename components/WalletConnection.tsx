/**
 * WalletConnection Component
 * 
 * ULTRA MODERN & BALL GİBİ 🔥
 * Cüzdan bağlama/bağlantı kesme ve adres gösterimi
 */

'use client';

import { useState } from 'react';
import { StellarHelper } from '@/lib/stellar-helper';
import { FaWallet, FaCopy, FaCheck } from 'react-icons/fa';
import { MdLogout } from 'react-icons/md';

// Stellar helper instance
const stellarHelper = new StellarHelper('testnet');

interface WalletConnectionProps {
  onConnect: (publicKey: string) => void;
  onDisconnect: () => void;
}

export default function WalletConnection({ onConnect, onDisconnect }: WalletConnectionProps) {
  const [publicKey, setPublicKey] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleConnect = async () => {
    try {
      setLoading(true);
      const key = await stellarHelper.connectWallet();
      setPublicKey(key);
      setIsConnected(true);
      onConnect(key);
    } catch (error: any) {
      console.error('Connection error:', error);
      alert(`❌ Cüzdan bağlanamadı:\n\n${error.message}\n\nLütfen Freighter wallet kurulu olduğundan emin olun!`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    stellarHelper.disconnect();
    setPublicKey('');
    setIsConnected(false);
    onDisconnect();
  };

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  if (!isConnected) {
    return (
      <div className="relative group">
        <button
          onClick={handleConnect}
          disabled={loading}
          className="px-8 py-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white font-black rounded-2xl transition-all transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl border-2 border-white/30 flex items-center gap-3"
        >
          {loading ? (
            <>
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-solid border-white border-r-transparent"></div>
              <span className="text-lg">Bağlanıyor...</span>
            </>
          ) : (
            <>
              <FaWallet className="text-2xl animate-pulse" />
              <span className="text-lg">Cüzdan Bağla</span>
            </>
          )}
        </button>
        
        {/* Tooltip */}
        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-black/90 backdrop-blur-xl text-white text-xs font-bold py-2 px-4 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-2xl border border-white/20">
          🔐 Freighter, xBull, Albedo destekleniyor
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Connected Address Badge */}
      <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-xl border-2 border-green-400/50 rounded-2xl px-6 py-3 flex items-center gap-3 shadow-xl">
        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
        <span className="text-white font-black text-sm">
          {formatAddress(publicKey)}
        </span>
        
        <button
          onClick={handleCopyAddress}
          className="text-white/70 hover:text-white transition-colors transform hover:scale-110"
          title="Adresi kopyala"
        >
          {copied ? (
            <FaCheck className="text-green-400 text-lg" />
          ) : (
            <FaCopy className="text-lg" />
          )}
        </button>
      </div>

      {/* Disconnect Button */}
      <button
        onClick={handleDisconnect}
        className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 backdrop-blur-xl border-2 border-red-400/50 text-red-400 hover:text-red-300 font-black rounded-2xl transition-all transform hover:scale-110 active:scale-95 shadow-xl"
        title="Bağlantıyı kes"
      >
        <MdLogout className="text-2xl" />
      </button>
    </div>
  );
}