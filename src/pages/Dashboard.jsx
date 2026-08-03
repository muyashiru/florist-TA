import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [activeTab, setActiveTab] = useState('All Chat');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fitur WhatsApp Web Baru
  const [replyingTo, setReplyingTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  const [activeChatMenu, setActiveChatMenu] = useState(null);
  const [hasValidated, setHasValidated] = useState(false);
  const [hideEscalation, setHideEscalation] = useState(false);
  const [scenarios, setScenarios] = useState([]);

  const EMOJI_LIST = ['😊', '😂', '🌸', '💐', '❤️', '🙏', '👍', '✨', '🎉', '🔥'];

  // Fetch semua kontak saat pertama kali render (hanya jika sudah login)
  useEffect(() => {
    if (localStorage.getItem('isAdminAuth') !== 'true') {
      navigate('/admin/login');
      return;
    }
    fetchContacts();
    const interval = setInterval(fetchContacts, 5000); // Polling tiap 5 detik agar realtime

    fetch('http://localhost:3000/api/scenarios')
      .then(r => r.json())
      .then(d => { if(d.success) setScenarios(d.scenarios); })
      .catch(console.error);

    return () => clearInterval(interval);
  }, [navigate]);

  // Fetch riwayat chat ketika kontak dipilih
  useEffect(() => {
    if (selectedContact) {
      setHasValidated(false); // Munculkan kembali tombol validasi jika beralih pelanggan
      setHideEscalation(false); // Reset status hide escalation
      fetchMessages(selectedContact.no_wa);
      const interval = setInterval(() => fetchMessages(selectedContact.no_wa), 3000); // Polling chat
      return () => clearInterval(interval);
    }
  }, [selectedContact]);

  const prevMessagesLengthRef = useRef(0);

  // Scroll ke bawah saat kontak berganti
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [selectedContact]);

  // Scroll ke bawah HANYA jika ada pesan baru yang masuk (panjang array bertambah)
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  const fetchContacts = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/admin/contacts');
      const data = await res.json();
      if (data.success) {
        setContacts(data.data);
      }
    } catch (err) {
      console.error('Gagal fetch kontak:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (noWa) => {
    try {
      const res = await fetch(`http://localhost:3000/api/admin/messages/${noWa}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
      }
    } catch (err) {
      console.error('Gagal fetch pesan:', err);
    }
  };

  const toggleAiStatus = async () => {
    if (!selectedContact) return;
    const newStatus = !selectedContact.is_ai_active;
    try {
      const res = await fetch('http://localhost:3000/api/admin/toggle-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ no_wa: selectedContact.no_wa, is_ai_active: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedContact({ ...selectedContact, is_ai_active: newStatus });
        fetchContacts(); // Update sidebar juga
      }
    } catch (err) {
      console.error('Gagal toggle AI:', err);
    }
  };

  const handlePinChat = async (noWa, currentPinStatus) => {
    try {
      await fetch(`http://localhost:3000/api/admin/contacts/${noWa}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: !currentPinStatus })
      });
      fetchContacts();
    } catch (err) {
      console.error('Gagal pin chat:', err);
    }
  };

  const handleDeleteChat = async (noWa) => {
    if (!window.confirm('Yakin ingin menghapus seluruh riwayat chat ini?')) return;
    try {
      await fetch(`http://localhost:3000/api/admin/contacts/${noWa}`, {
        method: 'DELETE'
      });
      if (selectedContact?.no_wa === noWa) {
        setSelectedContact(null);
      }
      fetchContacts();
    } catch (err) {
      console.error('Gagal hapus chat:', err);
    }
  };

  const handleSendMessage = async (e, overrideText = null) => {
    if (e) e.preventDefault();
    const textToSend = overrideText || inputText;
    if (!textToSend.trim() || !selectedContact) return;
    
    const replyToId = replyingTo?.id || null;
    
    if (!overrideText) setInputText('');
    setReplyingTo(null);
    setShowEmojiPicker(false);
    
    // Tampilkan di UI secara optimis
    setMessages(prev => [...prev, { 
      id: Date.now(), // temporary ID
      sender: 'admin', 
      message_text: textToSend, 
      created_at: new Date(),
      reply_to_id: replyToId
    }]);

    try {
      await fetch('http://localhost:3000/api/admin/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          no_wa: selectedContact.no_wa, 
          message: textToSend,
          reply_to_id: replyToId
        })
      });
      fetchMessages(selectedContact.no_wa);
    } catch (err) {
      console.error('Gagal mengirim pesan:', err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedContact) return;
    
    // Tampilkan indikator loading di UI (optimistik sederhana)
    const tempId = Date.now();
    setMessages(prev => [...prev, { 
      id: tempId, sender: 'admin', message_text: '📸 Mengunggah gambar...', created_at: new Date(), reply_to_id: replyingTo?.id || null 
    }]);

    const formData = new FormData();
    formData.append('image', file);

    try {
      // 1. Upload gambar
      const uploadRes = await fetch('http://localhost:3000/api/admin/upload-image', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();
      
      if (uploadData.success) {
        // 2. Kirim pesan dengan path gambar
        const textToSend = `[IMAGE]${uploadData.url}`;
        const replyToId = replyingTo?.id || null;
        setReplyingTo(null);

        await fetch('http://localhost:3000/api/admin/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ no_wa: selectedContact.no_wa, message: textToSend, reply_to_id: replyToId })
        });
        
        fetchMessages(selectedContact.no_wa);
      }
    } catch (err) {
      console.error('Gagal upload gambar:', err);
      fetchMessages(selectedContact.no_wa); // reload untuk menghapus indikator loading
    }
    
    // Reset input file
    e.target.value = null;
  };

  const handleDeleteMessage = async (id, type) => {
    setActiveMessageMenu(null);
    
    // Hapus optimistik
    if (type === 'for_me') {
      setMessages(prev => prev.filter(m => m.id !== id));
    } else {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_deleted_for_everyone: 1 } : m));
    }

    try {
      await fetch(`http://localhost:3000/api/admin/messages/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      fetchMessages(selectedContact.no_wa);
    } catch (err) {
      console.error('Gagal menghapus pesan:', err);
    }
  };

  const handleAcceptPaymentAndOrderCourier = async () => {
    if (!selectedContact) return;
    
    const confirmOrder = window.confirm('Terima pembayaran dan pesan kurir Gojek via Biteship untuk pesanan ini?');
    if (!confirmOrder) return;
    
    setHasValidated(true); // Sembunyikan tombol
    
    // 1. Kirim pesan terima pembayaran
    await handleSendMessage(null, "Halo Kak, pembayaran DP/Lunas sudah kami terima ya! Pesanan segera kami proses 🌸");
    
    // 2. Langsung eksekusi pesan kurir Biteship
    try {
      const res = await fetch('http://localhost:3000/api/admin/order-courier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ no_wa: selectedContact.no_wa })
      });
      const data = await res.json();
      
      if (data.success) {
        alert(`Berhasil Terima Pembayaran & Test Order di Biteship!\n\nID Order Biteship Anda:\n${data.order_id}`);
        fetchMessages(selectedContact.no_wa); // Refresh untuk melihat balasan resi
      } else {
        alert(`Pembayaran diterima, tapi Gagal memesan kurir: ${data.message}`);
      }
    } catch (e) {
      alert(`Terjadi kesalahan jaringan saat memesan kurir: ${e.message}`);
    }
  };

  const insertEmoji = (emoji) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Kemarin ' + date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }) + ' ' + date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.no_wa?.includes(searchQuery);
    if (activeTab === 'AI On') return matchesSearch && c.is_ai_active;
    if (activeTab === 'AI Off') return matchesSearch && !c.is_ai_active;
    return matchesSearch;
  });

  const activeContact = selectedContact ? (contacts.find(c => c.no_wa === selectedContact.no_wa) || selectedContact) : null;

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans text-gray-800">
      
      {/* SIDEBAR (Kiri) */}
      <div className="w-[350px] border-r border-gray-200 flex flex-col bg-white flex-shrink-0">
        
        {/* Sidebar Header */}
        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
          <button 
            onClick={() => navigate('/admin/overview')}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#00BFA5] text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-[#009688] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            Overview
          </button>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (window.confirm('Yakin ingin keluar dari Inbox?')) {
                  localStorage.removeItem('isAdminAuth');
                  navigate('/admin/login');
                }
              }}
              className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors" 
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pt-4 pb-2">
          <div className="relative flex items-center">
            <div className="absolute left-3 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input 
              type="text" 
              placeholder="Cari chat, nama, atau nomor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Filter Chips */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide border-b border-gray-100">
          {['All Chat', 'AI On', 'AI Off'].map(tab => {
            let badgeCount = 0;
            if (tab === 'AI Off') {
              badgeCount = contacts.filter(c => c.is_ai_active === 0).length;
            }
            return (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
                  activeTab === tab 
                    ? 'border-green-300 bg-green-50 text-green-700' 
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab}
                {badgeCount > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none font-bold ${activeTab === tab ? 'bg-green-600 text-white' : 'bg-red-500 text-white'}`}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Memuat chat...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Tidak ada chat ditemukan.</div>
          ) : (
            filteredContacts.map(c => {
              const isActive = selectedContact?.no_wa === c.no_wa;
              const isAiOn = c.is_ai_active;
              const initials = c.name ? c.name.charAt(0).toUpperCase() : '?';
              
              const bgColors = ['bg-pink-100 text-pink-600', 'bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 'bg-yellow-100 text-yellow-600', 'bg-purple-100 text-purple-600'];
              const colorIdx = initials.charCodeAt(0) % bgColors.length;
              const avatarClass = bgColors[colorIdx];

              return (
                <div 
                  key={c.no_wa}
                  onClick={() => { setSelectedContact(c); setActiveMessageMenu(null); }}
                  className={`flex items-center p-3 cursor-pointer transition-colors border-b border-gray-50 ${
                    isActive ? 'bg-[#E8F5E9] border-l-4 border-l-[#388E3C]' : 'bg-white hover:bg-gray-50 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="relative shrink-0 mr-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${avatarClass}`}>
                      {initials}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-[2px]">
                      <svg className="w-3.5 h-3.5 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24"><path d="M12.012 2c5.506 0 9.998 4.478 9.998 9.984a9.964 9.964 0 01-1.42 5.122l1.442 5.27-5.394-1.415a9.969 9.969 0 01-4.626 1.133h-.005c-5.501 0-9.992-4.478-9.992-9.985A10.026 10.026 0 0112.012 2m0-1.636C6.417.364.364 6.417.364 11.983c0 1.983.515 3.916 1.498 5.617L.198 23.636l6.196-1.624a11.644 11.644 0 005.618 1.443h.005c6.438 0 11.66-5.223 11.66-11.66A11.71 11.71 0 0011.986.364z"/></svg>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5 group">
                      <div className="flex items-center gap-1.5 truncate">
                        {c.is_pinned === 1 && (
                          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 24 24" style={{ transform: 'rotate(45deg)' }}><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" /></svg>
                        )}
                        <span className="font-semibold text-[15px] text-gray-900 truncate">
                          {c.name} {c.no_wa.includes('SANDBOX') ? '(Sandbox)' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 relative">
                        <span className={`text-[11px] ${isActive ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                          {formatTime(c.last_message_time)}
                        </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveChatMenu(activeChatMenu === c.no_wa ? null : c.no_wa); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-gray-600 transition-opacity"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        
                        {activeChatMenu === c.no_wa && (
                          <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-50">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handlePinChat(c.no_wa, c.is_pinned); setActiveChatMenu(null); }}
                              className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              {c.is_pinned ? 'Unpin Chat' : 'Pin Chat'}
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteChat(c.no_wa); setActiveChatMenu(null); }}
                              className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              Delete Chat
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        {isAiOn ? (
                          <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-semibold border border-blue-100">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            Admin AI
                          </span>
                        ) : c.last_message?.startsWith('[ESCALATION]') ? (
                          <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded text-[10px] font-semibold border border-orange-200">
                            Need Help
                          </span>
                        ) : (
                          <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-semibold border border-gray-200">
                            Human
                          </span>
                        )}
                        <span className="text-gray-400 text-xs shrink-0">✓</span>
                        <p className="text-[13px] text-gray-500 truncate leading-snug">
                          {c.last_message?.startsWith('[ESCALATION]') ? '⚠️ AI Butuh Bantuan' : c.last_message || 'Belum ada pesan'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CHAT AREA (Kanan) */}
      <div className="flex-1 flex flex-col bg-[#FDFDFD]">
        {selectedContact ? (
          <>
            {/* Header Chat Kanan */}
            <div className="h-16 px-4 border-b border-gray-200 flex justify-between items-center bg-white z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 text-lg">
                  {selectedContact.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24"><path d="M12.012 2c5.506 0 9.998 4.478 9.998 9.984a9.964 9.964 0 01-1.42 5.122l1.442 5.27-5.394-1.415a9.969 9.969 0 01-4.626 1.133h-.005c-5.501 0-9.992-4.478-9.992-9.985A10.026 10.026 0 0112.012 2m0-1.636C6.417.364.364 6.417.364 11.983c0 1.983.515 3.916 1.498 5.617L.198 23.636l6.196-1.624a11.644 11.644 0 005.618 1.443h.005c6.438 0 11.66-5.223 11.66-11.66A11.71 11.71 0 0011.986.364z"/></svg>
                    <h3 className="font-semibold text-[15px] text-gray-800">{selectedContact.name}</h3>
                  </div>
                  <p className="text-[12px] text-gray-500 leading-none mt-1">{selectedContact.no_wa}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {selectedContact.no_wa === '0895339549364_SANDBOX' && (
                  <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                    <select 
                      id="dashboardScenarioSelect" 
                      className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#00BFA5]"
                    >
                      <option value="">-- Pilih Skenario --</option>
                      {scenarios.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <button 
                      onClick={async () => {
                        const id = document.getElementById('dashboardScenarioSelect').value;
                        if (!id) return alert('Pilih skenario dulu!');
                        if (!confirm('Load skenario ini? Obrolan saat ini akan tertimpa.')) return;
                        try {
                          const res = await fetch('http://localhost:3000/api/scenarios/'+id+'/load', { method: 'POST' });
                          const data = await res.json();
                          if (data.success) {
                            alert('Skenario berhasil diload!');
                            fetchMessages(selectedContact.no_wa);
                          } else {
                            alert('Gagal: ' + data.message);
                          }
                        } catch(e) {
                          alert('Error: ' + e.message);
                        }
                      }}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded transition-colors"
                    >
                      Load
                    </button>
                  </div>
                )}
                
                {showChatSearch && (
                  <input 
                    type="text" 
                    placeholder="Cari pesan..." 
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#00BFA5] w-48 transition-all"
                    autoFocus
                  />
                )}
                <button 
                  onClick={() => {
                    setShowChatSearch(!showChatSearch);
                    if (showChatSearch) setChatSearchQuery('');
                  }}
                  className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${showChatSearch ? 'bg-gray-100 text-green-600' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </button>
                
                {/* AI Toggle / Halo Assistant Switch */}
                <button 
                  onClick={toggleAiStatus}
                  className={`ml-2 px-4 py-1.5 rounded-full border text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${
                    activeContact?.is_ai_active 
                      ? 'border-[#00BFA5] text-[#00BFA5] hover:bg-[#E0F2F1]' 
                      : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                  </svg>
                  {activeContact?.is_ai_active ? 'Halo Assistant' : 'Human Mode'}
                </button>
              </div>
            </div>

            {/* List Pesan */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 relative" style={{ backgroundColor: '#F0F2F5', backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png")', backgroundSize: '400px', backgroundBlendMode: 'overlay' }} onClick={() => setActiveMessageMenu(null)}>
              
              <div className="flex justify-center mb-6">
                <span className="bg-white/90 text-gray-500 text-[11px] px-3 py-1 rounded-full shadow-sm font-medium border border-gray-100">
                  🗓️ Mulai Percakapan
                </span>
              </div>

              {messages.filter(msg => {
                if (!chatSearchQuery) return true;
                return msg.message_text?.toLowerCase().includes(chatSearchQuery.toLowerCase());
              }).map((msg, idx) => {
                // Jangan render kalau admin sudah delete for me
                if (msg.is_deleted_by_admin) return null;
                if (msg.message_text?.startsWith('[ESCALATION]')) return null; // Sembunyikan bubble eskalasi

                const isAdmin = msg.sender === 'ai' || msg.sender === 'admin';
                const isDeletedForAll = msg.is_deleted_for_everyone;
                const showMenu = activeMessageMenu === msg.id;

                // Cari pesan yang direply
                const quotedMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;

                return (
                  <div key={idx} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'} group relative`}>
                    
                    <div 
                      className={`max-w-[70%] rounded-lg p-2 text-[14.5px] leading-relaxed relative shadow-[0_1px_2px_rgba(0,0,0,0.1)] group/bubble ${
                        isAdmin 
                          ? 'bg-[#E8F5E9] border border-[#A5D6A7] text-gray-800 rounded-tr-none' 
                          : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                      }`}
                      style={{ whiteSpace: 'pre-wrap' }}
                    >
                      {/* Menu Tombol Dropdown */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMessageMenu(msg.id === activeMessageMenu ? null : msg.id); }}
                        className={`absolute top-1 right-1 w-6 h-6 bg-gradient-to-l from-white/90 to-transparent rounded-full flex items-center justify-center text-gray-500 opacity-0 group-hover/bubble:opacity-100 transition-opacity`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>

                      {/* Dropdown Menu Popup */}
                      {showMenu && (
                        <div className={`absolute top-7 ${isAdmin ? 'right-0' : 'left-0'} w-48 bg-white border border-gray-100 shadow-lg rounded-xl z-20 py-1 overflow-hidden`}>
                          {!isDeletedForAll && (
                            <button onClick={() => setReplyingTo(msg)} className="w-full text-left px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50">Balas pesan</button>
                          )}
                          <button onClick={() => handleDeleteMessage(msg.id, 'for_me')} className="w-full text-left px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50">Hapus untuk saya</button>
                          {!isDeletedForAll && isAdmin && (
                            <button onClick={() => handleDeleteMessage(msg.id, 'for_everyone')} className="w-full text-left px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50 font-medium">Hapus untuk semua orang</button>
                          )}
                        </div>
                      )}

                      {/* Quoted Message (Reply) */}
                      {quotedMsg && !isDeletedForAll && (
                        <div className={`mb-2 px-2 py-1.5 rounded-md border-l-4 text-xs ${quotedMsg.sender === 'user' ? 'bg-black/5 border-purple-500 text-purple-700' : 'bg-black/5 border-green-500 text-green-700'}`}>
                          <div className="font-bold mb-0.5">{quotedMsg.sender === 'user' ? selectedContact.name : 'Anda'}</div>
                          <div className="text-gray-600 truncate max-h-10 overflow-hidden line-clamp-2">
                            {quotedMsg.is_deleted_for_everyone ? '🚫 Pesan ini telah dihapus' : 
                             quotedMsg.message_text.includes('[IMAGE]') ? '📸 Foto' : 
                             quotedMsg.message_text}
                          </div>
                        </div>
                      )}

                      {/* Konten Utama Pesan */}
                      {isDeletedForAll ? (
                        <div className="text-gray-400 italic text-sm flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                          Pesan ini telah dihapus
                        </div>
                      ) : (
                        <>
                          {/* Rendering Gambar [IMAGE] */}
                          {msg.message_text.startsWith('[IMAGE]') ? (
                            <img 
                              src={`http://localhost:3000${msg.message_text.replace('[IMAGE]', '')}`} 
                              alt="Attachment" 
                              className="max-w-full sm:max-w-[250px] rounded-md cursor-pointer border border-gray-200" 
                            />
                          ) : (
                            <>
                              {msg.message_text.includes('[Mengirimkan Foto]') && !isAdmin ? (
                                <div className="mb-2 border border-gray-200 rounded-lg p-3 bg-gray-50/50">
                                  <div className="italic text-sm opacity-80 mb-3 flex items-center gap-2">
                                    📸 Customer melampirkan foto/gambar
                                  </div>
                                </div>
                              ) : null}
                              
                              {/* Teks Pesan Biasa */}
                              {(() => {
                                let displayMsg = msg.message_text.replace('[Mengirimkan Foto]', '').trim();
                                let catalogHtml = null;
                                

                                // Jika (fallback) AI mentah-mentah menampilkan tulisan [HANDOFF] tanpa dibersihkan backend
                                if (displayMsg.includes('[HANDOFF]')) {
                                  displayMsg = displayMsg.replace(/\[HANDOFF\]/g, '').trim();
                                }
                                
                                
                                // Jika ada [IMAGE] di tengah string (QRIS)
                                if (displayMsg.includes('[IMAGE]')) {
                                    const imgParts = displayMsg.split('[IMAGE]');
                                    displayMsg = imgParts[0].trim();
                                    return (
                                        <div className="flex flex-col gap-2">
                                            <span>{displayMsg}</span>
                                            <img src={`http://localhost:3000${imgParts[1].trim()}`} alt="QRIS" className="max-w-[200px] rounded-md border border-gray-200" />
                                        </div>
                                    );
                                }

                                return (
                                  <>
                                    {displayMsg || (isAdmin ? '' : '📸 [Gambar]')}
                                  </>
                                );
                              })()}
                            </>
                          )}
                        </>
                      )}

                    </div>
                    
                    {/* Timestamp & Meta Data */}
                    <div className="flex items-center gap-2 mt-1 px-1">
                      {isAdmin && <span className="text-[10px] text-gray-400">✓✓</span>}
                      <span className="text-[11px] text-gray-500 font-medium">
                        {formatTime(msg.created_at)}
                      </span>
                      {isAdmin && (
                        <>
                          <span className="text-gray-300 text-[10px]">•</span>
                          <span className={`text-[11px] font-bold ${msg.sender === 'ai' ? 'text-[#00BFA5] bg-[#E0F2F1] px-1.5 rounded' : 'text-orange-500 bg-orange-50 px-1.5 rounded'}`}>
                            {msg.sender === 'ai' ? 'Halo AI' : 'Admin'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Area Input Chat Bawah */}
            <div className="bg-[#F0F2F5] px-4 py-3 border-t border-gray-200 flex flex-col shrink-0 relative">
              
              {/* Eskalasi Alert */}
              {(() => {
                if (activeContact?.is_ai_active || hideEscalation || messages.length === 0) return null;
                const lastMsg = messages[messages.length - 1].message_text;
                if (!lastMsg?.startsWith('[ESCALATION]')) return null;

                let alasan = 'AI mematikan dirinya otomatis karena pesanan ini mendesak/urgent atau terjadi error.';
                let draft = 'Halo Kak! Dengan Admin Jalé Florist di sini. Ada yang bisa dibantu?';
                
                const cleanMsg = lastMsg.replace('[ESCALATION]', '').trim();
                
                const alasanMatch = cleanMsg.match(/Alasan:\s*(.*?)(?=\s*\|\s*Draft:|$)/is);
                const draftMatch = cleanMsg.match(/Draft:\s*(.*)/is);
                
                if (alasanMatch && draftMatch) {
                    alasan = alasanMatch[1].replace(/\[HANDOFF\]|\[SILENT_HANDOFF\]/g, '').trim();
                    draft = draftMatch[1].replace(/\[HANDOFF\]|\[SILENT_HANDOFF\]/g, '').trim();
                } else if (cleanMsg) {
                    draft = cleanMsg.replace(/\[HANDOFF\]|\[SILENT_HANDOFF\]/g, '').trim() || draft;
                }

                const isPayment = alasan.toLowerCase().includes('bukti transfer') || alasan.toLowerCase().includes('pembayaran');

                return (
                  <div className="mb-3 border border-orange-200 bg-orange-50 rounded-lg p-3 shadow-sm">
                    <div className="flex items-center gap-2 text-orange-600 font-bold text-sm mb-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                      AI Butuh Bantuan Menjawab
                    </div>
                    <p className="text-orange-700 text-xs mb-3">{alasan}</p>
                    
                    <div className="flex flex-col gap-2">
                      {isPayment && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setHideEscalation(true);
                              handleAcceptPaymentAndOrderCourier();
                            }}
                            className="flex-1 bg-[#00BFA5] text-white text-xs font-bold py-2 rounded shadow-sm hover:bg-[#00897B] transition-colors"
                          >
                            ✅ Terima & Panggil Kurir
                          </button>
                          <button 
                            onClick={() => {
                              setHideEscalation(true);
                              handleSendMessage(new Event('submit'), "Mohon maaf Kak, foto bukti transfernya tidak terbaca/belum masuk. Bisa tolong dicek kembali? 🙏");
                            }}
                            className="flex-1 bg-white border border-red-200 text-red-500 text-xs font-bold py-2 rounded shadow-sm hover:bg-red-50 transition-colors"
                          >
                            ❌ Tolak
                          </button>
                        </div>
                      )}
                      <button 
                        onClick={() => {
                          setHideEscalation(true);
                          setInputText(draft);
                        }}
                        className="w-full bg-orange-600 border border-orange-600 text-white text-[12px] font-bold py-1.5 rounded shadow-sm hover:bg-orange-700 transition-colors"
                      >
                        Jawab Manual {isPayment ? '(Edit Draft)' : ''}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Notif AI Draft */}
              {activeContact?.is_ai_active === 1 && (
                <div className="flex items-center gap-3 mb-3 bg-white p-2.5 rounded-xl shadow-sm border border-gray-100">
                  <div className="w-10 h-10 bg-[#00BFA5] rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[14px] text-gray-800">Jale Florist Admin AI</span>
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold border border-blue-100">Aktif</span>
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <svg className="w-3 h-3 text-[#00BFA5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      Waiting for new message
                    </p>
                  </div>
                </div>
              )}

              {/* Preview Quote Reply */}
              {replyingTo && (
                <div className="bg-gray-100 p-3 mb-2 rounded-lg border-l-4 border-l-[#00BFA5] relative">
                  <button onClick={() => setReplyingTo(null)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <div className="font-bold text-sm text-[#00BFA5] mb-1">{replyingTo.sender === 'user' ? selectedContact.name : 'Anda'}</div>
                  <div className="text-xs text-gray-600 truncate">
                    {replyingTo.message_text.includes('[IMAGE]') ? '📸 Foto' : replyingTo.message_text}
                  </div>
                </div>
              )}

              {/* Emoji Picker Popover */}
              {showEmojiPicker && (
                <div className="absolute bottom-[70px] left-4 bg-white border border-gray-200 shadow-xl rounded-xl p-3 grid grid-cols-5 gap-2 z-20">
                  {EMOJI_LIST.map(emoji => (
                    <button 
                      key={emoji} 
                      onClick={() => insertEmoji(emoji)}
                      className="text-2xl hover:bg-gray-100 p-2 rounded-lg transition-transform hover:scale-110"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Form Input */}
              <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 text-gray-500 hover:text-gray-700 transition-colors relative">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                </button>
                
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ketik pesan..."
                  className="flex-1 rounded-xl px-4 py-3 bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00BFA5] focus:border-transparent transition-all shadow-sm"
                />
                
                <button 
                  type="submit"
                  disabled={!inputText.trim()}
                  className={`p-3 rounded-full transition-colors ${inputText.trim() ? 'bg-[#00BFA5] text-white hover:bg-[#00897B]' : 'bg-gray-200 text-gray-400'}`}
                >
                  <svg className="w-6 h-6 translate-x-[2px]" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-[#F0F2F5]">
            <img src="/logo.png" alt="Jale Florist" className="w-40 h-auto mb-6 opacity-30 grayscale" />
            <h2 className="text-2xl font-light text-gray-600 mb-2">Halo Assistant for Jalé Florist</h2>
            <p className="text-sm text-gray-400 text-center max-w-sm mb-8">Pilih chat dari menu di sebelah kiri untuk mulai mengelola pesan dan melihat draf AI.</p>
            <button 
              onClick={() => {
                localStorage.removeItem('isAdminAuth');
                navigate('/admin/login');
              }}
              className="px-6 py-2 bg-white border border-gray-300 text-gray-600 font-semibold rounded-full hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2"
            >
              🚪 Keluar dari Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
