/**
 * AirStellar - Ev/Oda Tokenizasyonu + Kiralama Platformu
 * 
 * Airbnb mantığıyla çalışan blockchain tabanlı oda kiralama sistemi
 * Ev sahipleri odalarını "kullanım hakkı tokeni" olarak mint eder
 * Kiracılar bu tokenleri alarak belirli süre o odayı kullanma hakkı kazanır
 * 
 * Blockchain logic: lib/stellar-helper.ts (DO NOT MODIFY)
 * Frontend: Ultra modern, ball gibi tasarım 🏠✨🔥
 */

'use client';

import { useState, useEffect } from 'react';
import WalletConnection from '@/components/WalletConnection';
import BalanceDisplay from '@/components/BalanceDisplay';
import PaymentForm from '@/components/PaymentForm';
import TransactionHistory from '@/components/TransactionHistory';
import { StellarHelper } from '@/lib/stellar-helper';

// Stellar helper instance
const stellarHelper = new StellarHelper('testnet');

// LocalStorage key
const MY_ROOMS_KEY = 'airstellar_my_rooms';
const MY_RENTALS_KEY = 'airstellar_my_rentals';

// ⬇️⬇️⬇️ BUNU EKLE ⬇️⬇️⬇️
const DEFAULT_OWNER_ADDRESS = 'GAIH3ULLFQ4DGSECF2AR555KZ4KNDGEKN4AFI4SU2M7B43MGK3QJZNSR';

// Room interface
interface Room {
  id: number;
  title: string;
  location: string;
  price: string;
  image: string;
  rating: string;
  reviews: number;
  tokenSupply: number;
  available: number;
  deposit: string;
  description: string;
  amenities: string[];
  ownerPublicKey?: string;
}

// Örnek oda verileri (gerçek uygulamada API'den gelir)
const SAMPLE_ROOMS: Room[] = [
  {
    id: 1,
    title: "Lüks Deniz Manzaralı Suit",
    location: "İstanbul, Beşiktaş",
    price: "150",
    image: "🏖️",
    rating: "4.9",
    reviews: 127,
    tokenSupply: 30,
    available: 22,
    deposit: "50",
    description: "Deniz manzaralı lüks suit. Balkonlu, jakuzili, modern mobilyalı.",
    amenities: ["WiFi", "Klima", "Jakuzi", "Balkon", "Deniz Manzarası"],
    ownerPublicKey: DEFAULT_OWNER_ADDRESS
  },
  {
    id: 2,
    title: "Modern Şehir Merkezi Studio",
    location: "Ankara, Çankaya",
    price: "1",
    image: "🏙️",
    rating: "4.7",
    reviews: 89,
    tokenSupply: 25,
    available: 18,
    deposit: "0",
    description: "Şehir merkezinde modern studio daire. Metro yakını.",
    amenities: ["WiFi", "Klima", "Mutfak", "Metro Yakını"],
    ownerPublicKey: DEFAULT_OWNER_ADDRESS  },
  {
    id: 3,
    title: "Sakin Bahçeli Villa Odası",
    location: "İzmir, Çeşme",
    price: "120",
    image: "🌳",
    rating: "4.8",
    reviews: 156,
    tokenSupply: 20,
    available: 5,
    deposit: "40",
    description: "Bahçeli villada huzurlu oda. Havuz ve barbekü alanı mevcut.",
    amenities: ["WiFi", "Havuz", "Bahçe", "Barbekü", "Otopark"],
    ownerPublicKey: DEFAULT_OWNER_ADDRESS
  },
  {
    id: 4,
    title: "Merkezi Konum Tek Kişilik",
    location: "Antalya, Muratpaşa",
    price: "65",
    image: "🏢",
    rating: "4.6",
    reviews: 73,
    tokenSupply: 40,
    available: 35,
    deposit: "25",
    description: "Ekonomik ve merkezi konumda tek kişilik oda.",
    amenities: ["WiFi", "Klima", "Ortak Mutfak"],
    ownerPublicKey: DEFAULT_OWNER_ADDRESS
  }
];

export default function Home() {
  const [publicKey, setPublicKey] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [viewMode, setViewMode] = useState<'browse' | 'dashboard'>('browse');
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'myrooms' | 'myrentals'>('overview');
  const [showRentModal, setShowRentModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [rentDays, setRentDays] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [myRentals, setMyRentals] = useState<any[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>(SAMPLE_ROOMS);

  // Yeni oda ilan formu state'leri
  const [newRoom, setNewRoom] = useState({
    title: '',
    location: '',
    price: '',
    deposit: '',
    tokenSupply: '',
    description: '',
    amenities: [] as string[]
  });

  // Load my rooms from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRooms = localStorage.getItem(MY_ROOMS_KEY);
      if (savedRooms) {
        const rooms = JSON.parse(savedRooms);
        setMyRooms(rooms);
        setAllRooms([...SAMPLE_ROOMS, ...rooms]);
      }
      
      const savedRentals = localStorage.getItem(MY_RENTALS_KEY);
      if (savedRentals) {
        setMyRentals(JSON.parse(savedRentals));
      }
    }
  }, [publicKey]);

  const handleConnect = (key: string) => {
    setPublicKey(key);
    setIsConnected(true);
  };

  const handleDisconnect = () => {
    setPublicKey('');
    setIsConnected(false);
    setViewMode('browse');
  };

  const handlePaymentSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleRoomSelect = (room: Room) => {
    if (!isConnected) {
      alert('Oda kiralamak için lütfen önce cüzdanınızı bağlayın! 🔐');
      return;
    }
    setSelectedRoom(room);
    setShowRentModal(true);
  };

  const handleRentRoom = async () => {
  if (!selectedRoom || !publicKey) return;
  
  setIsProcessing(true);
  
  try {
    const totalCost = (parseFloat(selectedRoom.price) * rentDays) + parseFloat(selectedRoom.deposit);
    
    // ⬇️⬇️⬇️ BURAYI DEĞİŞTİR ⬇️⬇️⬇️
    let ownerAddress = selectedRoom.ownerPublicKey || DEFAULT_OWNER_ADDRESS;
    
    // Geçersiz adres kontrolü
    if (ownerAddress.startsWith('GXXXXXX') || ownerAddress.length !== 56) {
      ownerAddress = DEFAULT_OWNER_ADDRESS;
    }
    // ⬆️⬆️⬆️ BURAYA KADAR ⬆️⬆️⬆️
    
    const result = await stellarHelper.sendPayment({
      from: publicKey,
      to: ownerAddress,
      amount: totalCost.toString(),
      memo: `AirStellar: ${selectedRoom.title} - ${rentDays} gün`
    });

      if (result.success) {
        const rental = {
          id: Date.now(),
          room: selectedRoom,
          days: rentDays,
          totalCost,
          startDate: new Date().toISOString(),
          transactionHash: result.hash,
          status: 'active'
        };

        const existingRentals = JSON.parse(localStorage.getItem(MY_RENTALS_KEY) || '[]');
        existingRentals.push(rental);
        localStorage.setItem(MY_RENTALS_KEY, JSON.stringify(existingRentals));
        setMyRentals(existingRentals);

        alert(
          `🎉 Kiralama Başarılı!\n\n` +
          `Oda: ${selectedRoom.title}\n` +
          `Süre: ${rentDays} gün\n` +
          `Toplam: ${totalCost} XLM\n\n` +
          `✅ TX: ${result.hash?.substring(0, 20)}...`
        );
        
        setShowRentModal(false);
        setSelectedRoom(null);
        setRentDays(1);
        handlePaymentSuccess();
      } else {
        alert(`❌ İşlem başarısız!`);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      alert(`❌ Hata: ${error.message || 'Ödeme başarısız'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleListRoom = async () => {
    if (!newRoom.title || !newRoom.price || !newRoom.location || !publicKey) {
      alert('⚠️ Lütfen tüm zorunlu alanları doldurun!');
      return;
    }

    setIsProcessing(true);

    try {
      const room: Room = {
        id: Date.now(),
        title: newRoom.title,
        location: newRoom.location,
        price: newRoom.price,
        image: ['🏠', '🏖️', '🏙️', '🌳', '🏢', '🏡'][Math.floor(Math.random() * 6)],
        rating: '5.0',
        reviews: 0,
        tokenSupply: parseInt(newRoom.tokenSupply),
        available: parseInt(newRoom.tokenSupply),
        deposit: newRoom.deposit,
        description: newRoom.description,
        amenities: newRoom.amenities,
        ownerPublicKey: publicKey
      };

      const existingRooms = JSON.parse(localStorage.getItem(MY_ROOMS_KEY) || '[]');
      existingRooms.push(room);
      localStorage.setItem(MY_ROOMS_KEY, JSON.stringify(existingRooms));
      
      setMyRooms(existingRooms);
      setAllRooms([...SAMPLE_ROOMS, ...existingRooms]);

      alert(`🎉 Oda İlanı Başarılı!\n\n${newRoom.title}\n${newRoom.tokenSupply} token mint edildi!`);

      setNewRoom({
        title: '',
        location: '',
        price: '',
        deposit: '',
        tokenSupply: '',
        description: '',
        amenities: []
      });
      
      setShowListModal(false);
      setViewMode('dashboard');
      setDashboardTab('myrooms');
    } catch (error: any) {
      alert(`❌ Hata: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateTotal = () => {
    if (!selectedRoom) return 0;
    return (parseFloat(selectedRoom.price) * rentDays) + parseFloat(selectedRoom.deposit);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Rent Modal */}
      {showRentModal && selectedRoom && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-2xl rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20 animate-slideUp">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                    Oda Kirala
                  </h2>
                  <p className="text-gray-600 font-medium">Blockchain ile güvenli kiralama 🔐</p>
                </div>
                <button
                  onClick={() => {
                    setShowRentModal(false);
                    setSelectedRoom(null);
                    setRentDays(1);
                  }}
                  disabled={isProcessing}
                  className="text-gray-400 hover:text-gray-600 text-4xl leading-none transition-transform hover:rotate-90 duration-300"
                >
                  ×
                </button>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-6 mb-6 border border-purple-100">
                <div className="flex items-start gap-4">
                  <div className="text-6xl animate-bounce">{selectedRoom.image}</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-black text-gray-900 mb-2">{selectedRoom.title}</h3>
                    <p className="text-gray-700 font-semibold mb-2 flex items-center gap-2">
                      <span className="text-xl">📍</span>
                      {selectedRoom.location}
                    </p>
                    <p className="text-gray-600 text-sm mb-3 leading-relaxed">{selectedRoom.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedRoom.amenities.map((amenity, idx) => (
                        <span key={idx} className="px-4 py-2 bg-white/80 backdrop-blur rounded-full text-xs font-bold text-purple-600 shadow-lg border border-purple-100 hover:scale-110 transition-transform">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-lg font-black text-gray-900 mb-4">
                  ⏰ Kiralama Süresi
                </label>
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => setRentDays(Math.max(1, rentDays - 1))}
                    disabled={isProcessing}
                    className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-2xl font-black text-2xl text-white shadow-xl disabled:opacity-50 transform hover:scale-110 active:scale-95 transition-all"
                  >
                    −
                  </button>
                  <div className="flex-1 text-center bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl py-6 border-2 border-purple-200">
                    <div className="text-6xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{rentDays}</div>
                    <div className="text-lg text-gray-600 font-bold mt-2">Gün</div>
                  </div>
                  <button
                    onClick={() => setRentDays(rentDays + 1)}
                    disabled={isProcessing}
                    className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-2xl font-black text-2xl text-white shadow-xl disabled:opacity-50 transform hover:scale-110 active:scale-95 transition-all"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-6 mb-6 border-2 border-gray-200">
                <h4 className="font-black text-xl text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">💰</span>
                  Ödeme Detayları
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between text-gray-700 font-semibold text-lg">
                    <span>{selectedRoom.price} XLM × {rentDays} gün</span>
                    <span className="font-black">{parseFloat(selectedRoom.price) * rentDays} XLM</span>
                  </div>
                  <div className="flex justify-between text-gray-700 font-semibold text-lg">
                    <span>🔒 Güvence Depozitosu</span>
                    <span className="font-black">{selectedRoom.deposit} XLM</span>
                  </div>
                  <div className="border-t-2 border-gray-300 pt-4 flex justify-between text-2xl">
                    <span className="font-black text-gray-900">Toplam</span>
                    <span className="font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{calculateTotal()} XLM</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-4 mb-6">
                <p className="text-sm text-gray-700 font-semibold leading-relaxed">
                  ⚡ <strong className="text-purple-600">Güvenli İşlem:</strong> Ödemeniz Stellar blockchain üzerinden 
                  ev sahibine gönderilecek. İşlem kalıcı olarak kaydedilecektir.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowRentModal(false);
                    setSelectedRoom(null);
                    setRentDays(1);
                  }}
                  disabled={isProcessing}
                  className="flex-1 px-8 py-4 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-2xl font-black text-lg transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleRentRoom}
                  disabled={isProcessing}
                  className="flex-1 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl font-black text-lg transition-all shadow-2xl transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? '⏳ İşleniyor...' : '🎫 Kirala ve Öde'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List Room Modal */}
      {showListModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-2xl rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20 animate-slideUp">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-4xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                    Oda İlan Et
                  </h2>
                  <p className="text-gray-600 font-medium">Odanızı tokenlaştırın ve gelir elde edin 💎</p>
                </div>
                <button
                  onClick={() => setShowListModal(false)}
                  disabled={isProcessing}
                  className="text-gray-400 hover:text-gray-600 text-4xl leading-none transition-transform hover:rotate-90 duration-300"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-black text-gray-900 mb-2">
                    🏠 Oda Başlığı *
                  </label>
                  <input
                    type="text"
                    value={newRoom.title}
                    onChange={(e) => setNewRoom({ ...newRoom, title: e.target.value })}
                    placeholder="örn: Lüks Deniz Manzaralı Suit"
                    className="w-full px-6 py-4 bg-white/80 backdrop-blur border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-300 focus:border-purple-500 text-gray-900 font-semibold transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-gray-900 mb-2">
                    📍 Lokasyon *
                  </label>
                  <input
                    type="text"
                    value={newRoom.location}
                    onChange={(e) => setNewRoom({ ...newRoom, location: e.target.value })}
                    placeholder="örn: İstanbul, Beşiktaş"
                    className="w-full px-6 py-4 bg-white/80 backdrop-blur border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-300 focus:border-purple-500 text-gray-900 font-semibold transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-black text-gray-900 mb-2">
                      💰 Günlük Fiyat (XLM) *
                    </label>
                    <input
                      type="number"
                      value={newRoom.price}
                      onChange={(e) => setNewRoom({ ...newRoom, price: e.target.value })}
                      placeholder="100"
                      className="w-full px-6 py-4 bg-white/80 backdrop-blur border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-300 focus:border-purple-500 text-gray-900 font-semibold transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-gray-900 mb-2">
                      🔒 Depozito (XLM) *
                    </label>
                    <input
                      type="number"
                      value={newRoom.deposit}
                      onChange={(e) => setNewRoom({ ...newRoom, deposit: e.target.value })}
                      placeholder="50"
                      className="w-full px-6 py-4 bg-white/80 backdrop-blur border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-300 focus:border-purple-500 text-gray-900 font-semibold transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-black text-gray-900 mb-2">
                    🎫 Token Arzı *
                  </label>
                  <input
                    type="number"
                    value={newRoom.tokenSupply}
                    onChange={(e) => setNewRoom({ ...newRoom, tokenSupply: e.target.value })}
                    placeholder="30"
                    className="w-full px-6 py-4 bg-white/80 backdrop-blur border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-300 focus:border-purple-500 text-gray-900 font-semibold transition-all"
                  />
                  <p className="text-sm text-gray-600 mt-2 font-medium">
                    Her token bir günlük kullanım hakkı temsil eder
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-black text-gray-900 mb-2">
                    📝 Açıklama
                  </label>
                  <textarea
                    value={newRoom.description}
                    onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                    placeholder="Odanız hakkında detaylı bilgi verin..."
                    rows={4}
                    className="w-full px-6 py-4 bg-white/80 backdrop-blur border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-300 focus:border-purple-500 text-gray-900 font-semibold resize-none transition-all"
                  />
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-4">
                  <p className="text-sm text-gray-700 font-semibold leading-relaxed">
                    ℹ️ <strong className="text-purple-600">Bilgi:</strong> İlan oluşturulduğunda blockchain üzerinde kaydınız oluşturulacak. 
                    Kiracılar bu odayı kiralayarak size XLM ödeyecekler.
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setShowListModal(false)}
                    disabled={isProcessing}
                    className="flex-1 px-8 py-4 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-2xl font-black text-lg transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleListRoom}
                    disabled={isProcessing}
                    className="flex-1 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-2xl font-black text-lg transition-all shadow-2xl transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? '⏳ İşleniyor...' : '🏠 Oda İlan Et'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/10 backdrop-blur-2xl shadow-2xl sticky top-0 z-40 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setViewMode('browse')}>
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-3xl flex items-center justify-center text-3xl shadow-2xl transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                🏠
              </div>
              <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
                  AirStellar
                </h1>
                <p className="text-xs text-white/80 font-bold">Blockchain Powered Rentals</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {isConnected && (
                <>
                  <button
                    onClick={() => setShowListModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-2xl font-black transition-all shadow-2xl transform hover:scale-110 active:scale-95 text-sm"
                  >
                    🏠 Oda İlan Et
                  </button>
                  <button
                    onClick={() => {
                      setViewMode(viewMode === 'browse' ? 'dashboard' : 'browse');
                      if (viewMode === 'browse') setDashboardTab('overview');
                    }}
                    className="px-6 py-3 text-sm font-black text-white/90 hover:text-white transition-all hover:scale-110 transform"
                  >
                    {viewMode === 'browse' ? '📊 Dashboard' : '🏠 Odalar'}
                  </button>
                </>
              )}
              <div className="transform hover:scale-105 transition-transform">
                <WalletConnection onConnect={handleConnect} onDisconnect={handleDisconnect} />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {viewMode === 'browse' ? (
          <>
            {/* Hero Section */}
            <div className="mb-16 text-center animate-fadeIn">
              <h2 className="text-7xl font-black text-white mb-6 leading-tight drop-shadow-2xl">
                Odanızı Tokenlaştırın
                <br/>
                <span className="bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
                  Gelir Elde Edin
                </span>
              </h2>
              <p className="text-2xl text-white/90 max-w-4xl mx-auto mb-10 font-bold leading-relaxed drop-shadow-lg">
                Blockchain teknolojisi ile ev sahipleri odalarını kullanım hakkı tokeni olarak mint eder.
                Kiracılar güvenli smart contract ile ödeme yapar 🔐✨
              </p>
              
              {!isConnected && (
                <div className="inline-flex items-center gap-3 px-12 py-6 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 text-white rounded-full shadow-2xl animate-bounce font-black text-xl border-4 border-white/20">
                  <span className="text-3xl">👆</span>
                  <span>Başlamak için cüzdanınızı bağlayın</span>
                </div>
              )}
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
              {[
                { icon: '🏠', value: allRooms.length, label: 'Aktif Oda' },
                { icon: '👥', value: '2,451', label: 'Mutlu Kiracı' },
                { icon: '⚡', value: '3-5s', label: 'İşlem Süresi' },
                { icon: '🔒', value: '100%', label: 'Güvenli' }
              ].map((stat, idx) => (
                <div key={idx} className="bg-white/10 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl hover:shadow-pink-500/50 transition-all duration-300 border border-white/20 transform hover:scale-110 hover:-translate-y-2 group">
                  <div className="text-5xl mb-4 group-hover:scale-125 transition-transform">{stat.icon}</div>
                  <div className="text-5xl font-black text-white mb-2">{stat.value}</div>
                  <div className="text-sm text-white/80 font-bold">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Room Listings */}
            <div className="mb-16">
              <h3 className="text-5xl font-black text-white mb-10 flex items-center gap-4 drop-shadow-lg">
                <span className="text-6xl animate-bounce">🌟</span>
                Tüm Odalar
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {allRooms.map((room) => (
                  <div
                    key={room.id}
                    className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl hover:shadow-pink-500/50 transition-all duration-500 overflow-hidden cursor-pointer transform hover:-translate-y-4 hover:rotate-1 group border-2 border-white/50"
                  >
                    <div className="h-56 bg-gradient-to-br from-purple-200 via-pink-200 to-orange-200 flex items-center justify-center text-7xl group-hover:scale-125 transition-transform duration-500 relative">
                      {room.image}
                      {room.ownerPublicKey === publicKey && (
                        <div className="absolute top-3 right-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full text-xs font-black shadow-xl animate-pulse">
                          Sizin
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6">
                      <h4 className="font-black text-gray-900 text-xl leading-tight mb-3">
                        {room.title}
                      </h4>
                      
                      <p className="text-sm text-gray-700 font-bold mb-4 flex items-center gap-2">
                        <span className="text-xl">📍</span>
                        {room.location}
                      </p>
                      
                      <div className="flex items-center gap-2 mb-5">
                        <span className="text-yellow-400 text-xl">⭐</span>
                        <span className="font-black text-gray-900 text-lg">{room.rating}</span>
                        <span className="text-gray-600 text-sm font-bold">({room.reviews})</span>
                      </div>
                      
                      <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-4 mb-5 border-2 border-purple-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-gray-700 font-black">Token Arzı</span>
                          <span className="text-sm font-black text-purple-600">{room.tokenSupply}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-700 font-black">Müsait</span>
                          <span className={`text-sm font-black ${room.available < 10 ? 'text-red-600' : 'text-green-600'}`}>
                            {room.available} 🎫
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t-2 border-gray-200">
                        <div>
                          <div>
                            <span className="text-3xl font-black text-gray-900">{room.price}</span>
                            <span className="text-sm text-gray-700 font-black"> XLM</span>
                          </div>
                          <div className="text-xs text-gray-600 font-bold">+ {room.deposit} XLM depozito</div>
                        </div>
                        <button
                          onClick={() => handleRoomSelect(room)}
                          disabled={room.ownerPublicKey === publicKey}
                          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-black hover:shadow-2xl transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-110 active:scale-95"
                        >
                          {room.ownerPublicKey === publicKey ? 'Sizin' : 'Kirala'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* How It Works */}
            <div className="mt-20 bg-white/10 backdrop-blur-2xl rounded-[3rem] shadow-2xl p-16 border-2 border-white/20">
              <h3 className="text-6xl font-black text-center text-white mb-16 drop-shadow-lg">
                Nasıl Çalışır? 🤔
              </h3>
              
              <div className="grid md:grid-cols-3 gap-10">
                {[
                  { icon: '🏠', title: '1. Oda Tokenlaştırma', desc: 'Ev sahipleri odalarını blockchain üzerinde kullanım hakkı tokeni olarak mint eder.' },
                  { icon: '💳', title: '2. Güvenli Ödeme', desc: 'Kiracılar smart contract ile ödeme yapar. Kira bedeli ve depozito güvenle tutulur.' },
                  { icon: '🔑', title: '3. Kullanım Hakkı', desc: 'Token alan kişi belirli süre boyunca odayı kullanma hakkı kazanır.' }
                ].map((step, idx) => (
                  <div key={idx} className="text-center group">
                    <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-6xl mx-auto mb-8 shadow-2xl group-hover:scale-125 group-hover:rotate-12 transition-all duration-500">
                      {step.icon}
                    </div>
                    <h4 className="text-2xl font-black text-white mb-4">{step.title}</h4>
                    <p className="text-white/80 font-bold leading-relaxed text-lg">
                      {step.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="mt-16 grid md:grid-cols-3 gap-8">
              {[
                { icon: '⚡', title: 'Hızlı İşlemler', desc: 'Stellar blockchain ile işlemler 3-5 saniyede tamamlanır.', from: 'from-blue-600', to: 'to-cyan-600' },
                { icon: '💰', title: 'Düşük Ücretler', desc: 'İşlem ücreti sadece 0.00001 XLM. Minimal maliyet, maksimum verim.', from: 'from-purple-600', to: 'to-pink-600' },
                { icon: '🔒', title: 'Tam Güvenlik', desc: 'Smart contract ile ödemeleriniz güvende. Depozito otomatik yönetilir.', from: 'from-indigo-600', to: 'to-purple-600' }
              ].map((feature, idx) => (
                <div key={idx} className={`bg-gradient-to-br ${feature.from} ${feature.to} text-white rounded-3xl p-10 shadow-2xl border-2 border-white/20 transform hover:scale-105 hover:-translate-y-2 transition-all duration-300`}>
                  <div className="text-6xl mb-6">{feature.icon}</div>
                  <h3 className="text-2xl font-black mb-4">{feature.title}</h3>
                  <p className="text-white/90 font-bold leading-relaxed text-lg">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Dashboard View */
          <div className="space-y-8 animate-fadeIn">
            <div className="bg-white/10 backdrop-blur-2xl rounded-[3rem] shadow-2xl p-3 border-2 border-white/20 flex gap-3">
              {[
                { id: 'overview', icon: '📊', label: 'Genel Bakış' },
                { id: 'myrooms', icon: '🏠', label: `Odalarım (${myRooms.length})` },
                { id: 'myrentals', icon: '🎫', label: `Kiraladıklarım (${myRentals.length})` }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDashboardTab(tab.id as any)}
                  className={`flex-1 px-8 py-4 rounded-3xl font-black transition-all text-lg ${
                    dashboardTab === tab.id
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-2xl transform scale-105'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {dashboardTab === 'overview' && (
              <div className="bg-white/10 backdrop-blur-2xl rounded-[3rem] shadow-2xl p-10 border-2 border-white/20">
                <h2 className="text-5xl font-black text-white mb-8 flex items-center gap-4">
                  <span className="text-6xl">📊</span>
                  Kontrol Paneliniz
                </h2>
                <p className="text-white/80 mb-10 font-bold text-xl">
                  Cüzdan bakiyenizi görüntüleyin, ödeme gönderin ve işlem geçmişinizi takip edin.
                </p>

                <div key={`balance-${refreshKey}`} className="mb-10">
                  <BalanceDisplay publicKey={publicKey} />
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-3xl p-8 border-2 border-purple-300/30">
                    <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                      <span className="text-3xl">💸</span>
                      Ödeme Gönder
                    </h3>
                    <PaymentForm publicKey={publicKey} onSuccess={handlePaymentSuccess} />
                  </div>

                  <div key={`history-${refreshKey}`} className="bg-gradient-to-br from-indigo-500/20 to-blue-500/20 backdrop-blur-xl rounded-3xl p-8 border-2 border-indigo-300/30">
                    <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                      <span className="text-3xl">📜</span>
                      İşlem Geçmişi
                    </h3>
                    <TransactionHistory publicKey={publicKey} />
                  </div>
                </div>
              </div>
            )}

            {dashboardTab === 'myrooms' && (
              <div className="bg-white/10 backdrop-blur-2xl rounded-[3rem] shadow-2xl p-10 border-2 border-white/20">
                <h2 className="text-5xl font-black text-white mb-8 flex items-center gap-4">
                  <span className="text-6xl">🏠</span>
                  Yayınladığınız Odalar
                </h2>
                
                {myRooms.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-8xl mb-6 animate-bounce">🏠</div>
                    <p className="text-white/80 text-2xl font-bold mb-10">
                      Henüz hiç oda yayınlamadınız
                    </p>
                    <button
                      onClick={() => setShowListModal(true)}
                      className="px-12 py-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-3xl font-black text-xl transition-all shadow-2xl transform hover:scale-110 active:scale-95"
                    >
                      İlk Odanızı Yayınlayın
                    </button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {myRooms.map((room) => (
                      <div key={room.id} className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-3xl p-8 border-2 border-purple-300/30 transform hover:scale-105 transition-all">
                        <div className="text-6xl mb-6 text-center animate-bounce">{room.image}</div>
                        <h3 className="text-2xl font-black text-white mb-4">{room.title}</h3>
                        <p className="text-white/80 font-bold mb-6 flex items-center gap-2">
                          <span className="text-xl">📍</span>
                          {room.location}
                        </p>
                        <div className="space-y-3 mb-6">
                          <div className="flex justify-between text-base">
                            <span className="text-white/70 font-bold">Fiyat:</span>
                            <span className="font-black text-white">{room.price} XLM/gün</span>
                          </div>
                          <div className="flex justify-between text-base">
                            <span className="text-white/70 font-bold">Depozito:</span>
                            <span className="font-black text-white">{room.deposit} XLM</span>
                          </div>
                          <div className="flex justify-between text-base">
                            <span className="text-white/70 font-bold">Token Arzı:</span>
                            <span className="font-black text-white">{room.tokenSupply}</span>
                          </div>
                          <div className="flex justify-between text-base">
                            <span className="text-white/70 font-bold">Müsait:</span>
                            <span className="font-black text-green-400">{room.available}</span>
                          </div>
                        </div>
                        <div className="pt-5 border-t-2 border-white/20">
                          <p className="text-sm text-white/70 font-bold">
                            🎫 Toplam Gelir: <span className="text-yellow-400 font-black">{(room.tokenSupply - room.available) * parseFloat(room.price)} XLM</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {dashboardTab === 'myrentals' && (
              <div className="bg-white/10 backdrop-blur-2xl rounded-[3rem] shadow-2xl p-10 border-2 border-white/20">
                <h2 className="text-5xl font-black text-white mb-8 flex items-center gap-4">
                  <span className="text-6xl">🎫</span>
                  Kiraladığınız Odalar
                </h2>
                
                {myRentals.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-8xl mb-6 animate-bounce">🎫</div>
                    <p className="text-white/80 text-2xl font-bold mb-10">
                      Henüz hiç oda kiralamadınız
                    </p>
                    <button
                      onClick={() => setViewMode('browse')}
                      className="px-12 py-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-3xl font-black text-xl transition-all shadow-2xl transform hover:scale-110 active:scale-95"
                    >
                      Odaları Keşfet
                    </button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-8">
                    {myRentals.map((rental) => (
                      <div key={rental.id} className="bg-gradient-to-br from-indigo-500/20 to-blue-500/20 backdrop-blur-xl rounded-3xl p-8 border-2 border-indigo-300/30 transform hover:scale-105 transition-all">
                        <div className="flex items-start gap-6 mb-6">
                          <div className="text-6xl animate-bounce">{rental.room.image}</div>
                          <div className="flex-1">
                            <h3 className="text-2xl font-black text-white mb-2">{rental.room.title}</h3>
                            <p className="text-white/70 font-bold text-sm flex items-center gap-2">
                              <span className="text-xl">📍</span>
                              {rental.room.location}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-3 mb-6">
                          <div className="flex justify-between text-base">
                            <span className="text-white/70 font-bold">Süre:</span>
                            <span className="font-black text-white">{rental.days} gün</span>
                          </div>
                          <div className="flex justify-between text-base">
                            <span className="text-white/70 font-bold">Toplam Ödeme:</span>
                            <span className="font-black text-white">{rental.totalCost} XLM</span>
                          </div>
                          <div className="flex justify-between text-base">
                            <span className="text-white/70 font-bold">Başlangıç:</span>
                            <span className="font-black text-white">
                              {new Date(rental.startDate).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                          <div className="flex justify-between text-base">
                            <span className="text-white/70 font-bold">Durum:</span>
                            <span className="font-black text-green-400">✅ Aktif</span>
                          </div>
                        </div>
                        <div className="pt-5 border-t-2 border-white/20">
                          <p className="text-xs text-white/60 font-bold truncate">
                            🔗 TX: {rental.transactionHash?.substring(0, 30)}...
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-white/5 backdrop-blur-xl border-t-2 border-white/20 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center text-3xl shadow-2xl">
                  🏠
                </div>
                <span className="font-black text-2xl text-white">
                  AirStellar
                </span>
              </div>
              <p className="text-white/70 text-sm font-bold leading-relaxed">
                Blockchain teknolojisi ile güvenli, şeffaf ve hızlı oda kiralama platformu.
              </p>
            </div>

            {[
              { title: 'Platform', links: ['Nasıl Çalışır', 'Oda Listele', 'Oda Kirala', 'Fiyatlandırma'] },
              { title: 'Destek', links: ['Yardım Merkezi', 'SSS', 'İletişim', 'Güvenlik'] },
              { title: 'Blockchain', links: ['Stellar Network', 'Smart Contracts', 'Tokenomics', 'Whitepaper'] }
            ].map((section, idx) => (
              <div key={idx}>
                <h4 className="font-black text-white mb-6 text-lg">{section.title}</h4>
                <ul className="space-y-3 text-sm text-white/70 font-bold">
                  {section.links.map((link, i) => (
                    <li key={i}>
                      <a href="#" className="hover:text-white transition-colors hover:underline">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-10 border-t-2 border-white/10 text-center">
            <p className="text-white/70 text-sm mb-3 font-bold">
              ⚡ Stellar Blockchain ile Güçlendirilmiştir | 🧪 Testnet Üzerinde Çalışmaktadır
            </p>
            <p className="text-xs text-white/50 font-bold">
              ⚠️ Bu bir testnet uygulamasıdır. Gerçek para kullanmayın. Built with ❤️ for Stellar Community
            </p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-in;
        }
        @keyframes slideUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}