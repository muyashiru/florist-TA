import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Overview() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('summary'); // 'summary', 'queue', 'copilot'
  const [orderTab, setOrderTab] = useState('pickup');
  const [aiQuery, setAiQuery] = useState('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [timeFilter, setTimeFilter] = useState('hari_ini');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [stats, setStats] = useState({ totalChats: 0, aiPercentage: 0, aiCount: 0, activeOrders: 0 });
  const [trends, setTrends] = useState({ busyHours: [1, 1, 1, 1, 1, 1, 1], topProducts: [] });
  const [ordersData, setOrdersData] = useState({ pickup: [], delivery: [] });
  
  const [aiChat, setAiChat] = useState([
    { sender: 'ai', text: 'Halo Admin! Saya adalah AI Copilot tingkat tinggi yang bisa membaca dan merangkum database chat pelanggan secara real-time. Ada yang bisa saya analisis hari ini?' }
  ]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetch('http://localhost:3000/api/admin/overview/stats')
      .then(r => r.json())
      .then(d => { if(d.success) setStats(d.data); })
      .catch(console.error);

    fetch('http://localhost:3000/api/admin/orders')
      .then(r => r.json())
      .then(d => { 

        if (d.success) {
          const fetchedOrders = d.data;
          const pickup = [];
          const delivery = [];
          fetchedOrders.forEach((o, idx) => {
            const mappedOrder = {
              nomor: idx + 1,
              id: o.id,
              no_wa: o.no_wa,
              customer_name: o.customer_name,
              product: o.product,
              delivery_date: o.delivery_date,
              address: o.address,
              status: o.status,
              biteship_order_id: o.biteship_order_id,
              resi: o.resi,
              created_at: new Date(o.created_at).toLocaleString('id-ID')
            };
            if (o.resi === 'PICKUP' || o.address.toLowerCase().includes('toko') || o.address.toLowerCase().includes('ambil')) {
              pickup.push(mappedOrder);
            } else {
              delivery.push(mappedOrder);
            }
          });
          setOrdersData({ pickup, delivery });
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch(`http://localhost:3000/api/admin/overview/trends?filter=${timeFilter}`)
      .then(r => r.json())
      .then(d => { if(d.success) setTrends(d.data); })
      .catch(console.error);
  }, [timeFilter]);

  useEffect(() => {
    if (activeMenu === 'copilot') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiChat, activeMenu]);

  const handleAiSubmit = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim() || isLoadingAi) return;
    
    const query = aiQuery;
    setAiChat(prev => [...prev, { sender: 'admin', text: query }]);
    setAiQuery('');
    setIsLoadingAi(true);
    
    try {
      const res = await fetch('http://localhost:3000/api/admin/overview/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      setAiChat(prev => [...prev, { 
        sender: 'ai', 
        text: data.success ? data.reply : `Gagal: ${data.message}` 
      }]);
    } catch (err) {
      setAiChat(prev => [...prev, { sender: 'ai', text: 'Terjadi kesalahan jaringan.' }]);
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans text-gray-800 bg-[#f3f4f6]" style={{ backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      
      {/* Sidebar */}
      <aside className="w-72 bg-white/90 backdrop-blur-md border-r border-gray-200 flex flex-col shadow-sm z-20">
        <div className="p-6 border-b border-gray-200 flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 transition-colors shadow-sm"
            title="Kembali ke Inbox"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-base font-black text-gray-900 leading-tight">Jalé Florist<br/>Command Center</h1>
          </div>
        </div>
        
        <nav className="flex-1 p-5 flex flex-col gap-3">
          <button 
            onClick={() => setActiveMenu('summary')} 
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${activeMenu === 'summary' ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 border border-transparent'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            Ringkasan Data
          </button>
          
          <button 
            onClick={() => setActiveMenu('queue')} 
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${activeMenu === 'queue' ? 'bg-orange-50 text-orange-700 shadow-sm border border-orange-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 border border-transparent'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            Antrean Produksi
          </button>
          
          <button 
            onClick={() => setActiveMenu('copilot')} 
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${activeMenu === 'copilot' ? 'bg-purple-50 text-purple-700 shadow-sm border border-purple-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 border border-transparent'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            AI Copilot
          </button>
        </nav>
        
        <div className="p-5 border-t border-gray-200">
          <div className="flex items-center gap-2 justify-center py-2.5 px-4 bg-green-50 rounded-xl border border-green-100 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-bold text-green-700 uppercase tracking-wide">System Online</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Dynamic Header */}
        <header className="bg-white/70 backdrop-blur-md px-8 py-6 border-b border-gray-200 z-10 shrink-0 shadow-sm">
           <h2 className="text-2xl font-black text-gray-800 tracking-tight">
              {activeMenu === 'summary' && 'Ringkasan Data & Performa'}
              {activeMenu === 'queue' && 'Manajemen Antrean Produksi'}
              {activeMenu === 'copilot' && 'Admin Copilot AI'}
           </h2>
           <p className="text-sm text-gray-500 mt-1 font-medium">
              {activeMenu === 'summary' && 'Pantau statistik chat, efisiensi AI, dan tren pesanan.'}
              {activeMenu === 'queue' && 'Daftar pesanan aktif untuk diambil atau dikirim kurir.'}
              {activeMenu === 'copilot' && 'Asisten AI pintar untuk menganalisis data percakapan.'}
           </p>
        </header>
        
        {/* Content Body */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative">
            
            {/* 1. SUMMARY MENU */}
            {activeMenu === 'summary' && (
              <div className="flex flex-col gap-8 max-w-6xl mx-auto">
                {/* Top Analytics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-lg flex flex-col text-white relative overflow-hidden transform hover:scale-[1.02] transition-transform">
                    <div className="absolute -right-4 -top-4 opacity-10">
                      <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/></svg>
                    </div>
                    <span className="text-blue-100 text-sm font-semibold mb-2">Total Chat Hari Ini</span>
                    <div className="flex items-end gap-3 z-10">
                      <span className="text-5xl font-black">{stats.totalChats}</span>
                      <span className="text-sm bg-blue-400/30 px-3 py-1 rounded-full font-bold mb-1 shadow-sm">Hari ini</span>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-[#00BFA5] to-[#009688] p-6 rounded-2xl shadow-lg flex flex-col text-white relative overflow-hidden transform hover:scale-[1.02] transition-transform">
                    <div className="absolute -right-4 -top-4 opacity-10">
                      <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                    </div>
                    <span className="text-green-100 text-sm font-semibold mb-2">Ditangani AI Otomatis</span>
                    <div className="flex items-end gap-3 z-10">
                      <span className="text-5xl font-black">{stats.aiPercentage}%</span>
                      <span className="text-xs text-green-50 bg-black/10 px-2.5 py-1.5 rounded-lg mb-1 shadow-sm font-bold">({stats.aiCount} chat)</span>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-orange-400 to-pink-500 p-6 rounded-2xl shadow-lg flex flex-col text-white relative overflow-hidden transform hover:scale-[1.02] transition-transform">
                    <div className="absolute -right-4 -top-4 opacity-10">
                      <svg className="w-32 h-32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                    </div>
                    <span className="text-orange-100 text-sm font-semibold mb-2">Pesanan Aktif (Sandbox)</span>
                    <div className="flex items-end gap-3 z-10">
                      <span className="text-5xl font-black">{stats.activeOrders}</span>
                      <span className="text-xs text-white bg-white/20 px-2.5 py-1.5 rounded-lg mb-1 shadow-sm font-bold tracking-wide">PERLU DISIAPKAN</span>
                    </div>
                  </div>
                </div>

                {/* Trends Section */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" /><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" /></svg>
                      Tingkat Kesibukan & Tren
                    </h2>
                    <select 
                      value={timeFilter} 
                      onChange={(e) => setTimeFilter(e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
                    >
                      <option value="hari_ini">Hari Ini</option>
                      <option value="minggu_ini">Minggu Ini</option>
                      <option value="bulan_ini">Bulan Ini</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div>
                      <p className="text-xs text-gray-500 mb-4 font-bold tracking-wider">JAM PALING RAMAI HARI INI</p>
                      <div className="flex items-end gap-3 h-40 mt-4 border-b border-gray-100 pb-1 relative">
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                          <div className="w-full h-px bg-gray-100"></div>
                          <div className="w-full h-px bg-gray-100"></div>
                          <div className="w-full h-px bg-gray-100"></div>
                          <div className="w-full h-px bg-gray-100"></div>
                        </div>
                        {trends.busyHours.map((h, i) => (
                          <div key={i} className="flex-1 bg-blue-100 rounded-t-md relative group cursor-pointer transition-all duration-300 hover:bg-blue-200 shadow-sm" style={{ height: `${h * 8}%` }}>
                            <div className="absolute inset-0 bg-blue-500 rounded-t-md opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2 shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                               <span className="text-white text-xs font-black opacity-0 group-hover:opacity-100 transition-opacity">{h}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-3 font-bold">
                        <span>08:00</span>
                        <span>12:00</span>
                        <span>18:00</span>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 mb-5 font-bold tracking-wider">PRODUK TERPOPULER MINGGU INI</p>
                      <div className="space-y-6 mt-2">
                        {trends.topProducts.map((prod, i) => {
                          const colors = [
                            { bg: 'bg-pink-400', width: '85%' },
                            { bg: 'bg-green-400', width: '60%' },
                            { bg: 'bg-blue-400', width: '35%' }
                          ];
                          const style = colors[i] || colors[2];
                          return (
                            <div key={i}>
                              <div className="flex justify-between text-sm mb-2"><span className="text-gray-700 font-medium">{prod.name}</span><span className="font-black text-gray-900">{prod.count}x disebut</span></div>
                              <div className="w-full bg-gray-100 rounded-full h-2.5"><div className={`${style.bg} h-2.5 rounded-full shadow-sm`} style={{ width: style.width }}></div></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. QUEUE MENU */}
            {activeMenu === 'queue' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col min-h-full max-w-6xl mx-auto">
                <div className="border-b border-gray-100 p-6 flex justify-between items-center bg-white z-10 rounded-t-2xl">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    Daftar Pesanan
                  </h2>
                  <div className="flex bg-gray-100 p-1.5 rounded-xl shadow-inner">
                    <button 
                      onClick={() => setOrderTab('pickup')}
                      className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${orderTab === 'pickup' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Ambil Sendiri (Pick-Up)
                    </button>
                    <button 
                      onClick={() => setOrderTab('delivery')}
                      className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${orderTab === 'delivery' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      Kirim Kurir (Delivery)
                    </button>
                  </div>
                </div>
                
                <div className="p-0 overflow-x-auto">
                  {ordersData[orderTab].length > 0 ? (
                    <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                      <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-black text-gray-500 tracking-widest uppercase">
                          <th className="p-4 pl-6 whitespace-nowrap">Nomor</th>
                          <th className="p-4 whitespace-nowrap">No Wa</th>
                          <th className="p-4 whitespace-nowrap">Nama Customer</th>
                          <th className="p-4 min-w-[200px]">Produk</th>
                          <th className="p-4 whitespace-nowrap">Tanggal {orderTab === 'delivery' ? 'Pengiriman' : 'Pengambilan'}</th>
                          {orderTab === 'delivery' && <th className="p-4 min-w-[200px]">Alamat</th>}
                          <th className="p-4 whitespace-nowrap">Status</th>
                          <th className="p-4 whitespace-nowrap">Order Id</th>
                          <th className="p-4 whitespace-nowrap">Resi</th>
                          <th className="p-4 whitespace-nowrap">Tgl Pesan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {ordersData[orderTab].map((order) => (
                          <tr key={order.id} onClick={() => setSelectedOrder(order)} className="hover:bg-blue-50/50 transition-colors group cursor-pointer text-sm text-gray-700">
                            <td className="p-4 pl-6 align-middle font-bold text-gray-500">{order.nomor}</td>
                            <td className="p-4 align-middle font-medium bg-gray-50/50">{order.no_wa}</td>
                            <td className="p-4 align-middle font-bold text-gray-800">{order.customer_name}</td>
                            <td className="p-4 align-middle group-hover:text-blue-600 transition-colors font-medium">{order.product}</td>
                            <td className="p-4 align-middle font-medium text-blue-600">{order.delivery_date}</td>
                            {orderTab === 'delivery' && <td className="p-4 align-middle text-xs line-clamp-2 mt-2">{order.address}</td>}
                            <td className="p-4 align-middle">
                              <span className={`inline-flex text-xs px-2.5 py-1 rounded-md font-bold tracking-wide shadow-sm whitespace-nowrap ${order.status === 'Diproses' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' : 'bg-green-100 text-green-700 border border-green-300'}`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="p-4 align-middle text-xs font-mono bg-gray-50">{order.biteship_order_id}</td>
                            <td className="p-4 align-middle text-xs font-mono">{order.resi}</td>
                            <td className="p-4 align-middle text-xs text-gray-500">{order.created_at}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-24">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <p className="text-base font-bold text-gray-600">Tidak ada pesanan di kategori ini.</p>
                      <p className="text-sm text-gray-400 mt-1">Pesanan yang masuk akan muncul di sini.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. COPILOT MENU */}
            {activeMenu === 'copilot' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-md flex flex-col h-full max-w-5xl mx-auto overflow-hidden">
                <div className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] p-6 flex items-center gap-4 shrink-0 shadow-sm relative overflow-hidden">
                  <div className="absolute -right-4 -top-10 opacity-20">
                    <svg className="w-40 h-40 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-inner border border-white/30 z-10">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <div className="z-10">
                    <h2 className="text-white font-black text-xl tracking-tight">Admin Copilot AI</h2>
                    <p className="text-indigo-100 text-xs font-bold tracking-widest mt-1 uppercase">Analisis Database 24/7</p>
                  </div>
                </div>
                
                <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-[#f8fafc]">
                  {aiChat.map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        msg.sender === 'admin' 
                          ? 'bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white rounded-tr-sm font-medium' 
                          : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                      }`}>
                        {msg.text.split('\\n').map((line, idx) => <span key={idx}>{line}<br/></span>)}
                      </div>
                    </div>
                  ))}
                  {isLoadingAi && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-200 text-gray-500 p-4 rounded-2xl rounded-tl-sm shadow-sm flex gap-2 items-center">
                        <span className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce"></span>
                        <span className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                        <span className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                
                <div className="p-5 bg-white border-t border-gray-200 shrink-0">
                  <form onSubmit={handleAiSubmit} className="relative max-w-4xl mx-auto">
                    <input 
                      type="text" 
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      placeholder="Tanya info soal komplain, pesanan bulan ini, pelanggan royal..." 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pl-5 pr-14 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] transition-all shadow-sm"
                    />
                    <button 
                      type="submit"
                      disabled={isLoadingAi || !aiQuery.trim()}
                      className="absolute right-2 top-2 bottom-2 w-10 h-10 bg-[#8B5CF6] disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-[#7C3AED] rounded-lg flex items-center justify-center text-white transition-colors shadow-sm"
                    >
                      <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                  </form>
                </div>
              </div>
            )}

        </div>
      </main>

      {/* Modal Detail Order */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden transform transition-all border border-gray-200" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-orange-400 to-orange-500 p-6 flex justify-between items-center text-white">
              <h3 className="font-black text-xl flex items-center gap-3 tracking-wide">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                Detail Pesanan {selectedOrder.id}
              </h3>
              <button onClick={() => setSelectedOrder(null)} className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h4 className="text-2xl font-black text-gray-800">{selectedOrder.product}</h4>
                  <span className={`inline-flex mt-3 text-xs px-3 py-1.5 rounded-lg font-black tracking-wide ${selectedOrder.status === 'Siap Diambil' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>
                    STATUS: {selectedOrder.status.toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-y-6 gap-x-8 text-sm mb-8 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                <div>
                  <p className="text-gray-400 text-xs font-black mb-1.5 tracking-widest uppercase">Waktu {orderTab === 'pickup' ? 'Ambil' : 'Kirim'}</p>
                  <p className="font-bold text-gray-800 flex items-center gap-2 text-base">
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {selectedOrder.delivery_date}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs font-black mb-1.5 tracking-widest uppercase">Pemesan</p>
                  <p className="font-bold text-gray-800 text-base">{selectedOrder.customer_name}</p>
                  <p className="text-sm font-medium text-gray-500 mt-0.5">{selectedOrder.no_wa}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs font-black mb-1.5 tracking-widest uppercase">Biteship Order ID</p>
                  <p className="font-mono text-gray-800 bg-white border border-gray-200 px-3 py-1 rounded inline-block text-xs">{selectedOrder.biteship_order_id}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs font-black mb-1.5 tracking-widest uppercase">Nomor Resi / Waybill</p>
                  <p className="font-mono text-gray-800 bg-white border border-gray-200 px-3 py-1 rounded inline-block text-xs">{selectedOrder.resi}</p>
                </div>
              </div>
              
              {selectedOrder.address && selectedOrder.address !== 'Diambil ke toko' && (
                <div className="mb-8">
                  <p className="text-gray-400 text-xs font-black mb-2 tracking-widest uppercase flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Alamat Pengiriman
                  </p>
                  <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                    <p className="text-gray-800 font-medium leading-relaxed">{selectedOrder.address}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={() => setSelectedOrder(null)} className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-black tracking-wide rounded-xl hover:bg-gray-100 transition-colors shadow-sm">
                TUTUP
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
      `}} />
    </div>
  );
}
