import { useState } from 'react';

const infoItems = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    label: 'Alamat',
    value: 'Jl. Cicalengka Raya No.8, Antapani Kidul, Kota Bandung',
    href: 'https://maps.app.goo.gl/YoGwkwk3kZKQYqru8',
    theme: {
      bg: 'bg-blue-50/80 hover:bg-blue-100',
      iconBg: 'bg-blue-100 group-hover:bg-blue-500',
      text: 'text-blue-600',
      hoverText: 'group-hover:text-white',
      border: 'border-blue-100 hover:border-blue-300'
    }
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: 'Jam Operasional',
    value: 'Senin – Minggu, 08.30 – 18.30 WIB',
    href: null,
    theme: {
      bg: 'bg-amber-50/80',
      iconBg: 'bg-amber-100',
      text: 'text-amber-600',
      hoverText: '',
      border: 'border-amber-100'
    }
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
    label: 'WhatsApp',
    value: '+62 895-4027-65380',
    href: 'https://wa.me/62895402765380',
    theme: {
      bg: 'bg-emerald-50/80 hover:bg-emerald-100',
      iconBg: 'bg-emerald-100 group-hover:bg-[#25D366]',
      text: 'text-emerald-600',
      hoverText: 'group-hover:text-white',
      border: 'border-emerald-100 hover:border-emerald-300'
    }
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    label: 'Instagram',
    value: '@jale.floristt',
    href: 'https://instagram.com/jale.floristt',
    theme: {
      bg: 'bg-fuchsia-50/80 hover:bg-fuchsia-100',
      iconBg: 'bg-fuchsia-100 group-hover:bg-gradient-to-tr group-hover:from-yellow-400 group-hover:via-pink-500 group-hover:to-purple-500',
      text: 'text-fuchsia-600',
      hoverText: 'group-hover:text-white',
      border: 'border-fuchsia-100 hover:border-fuchsia-300'
    }
  },
];

function FeatureCard({ item }) {
  const [isRaining, setIsRaining] = useState(false);

  const handleClick = () => {
    if (isRaining) return;
    setIsRaining(true);
    setTimeout(() => setIsRaining(false), 2000); // Selesai dalam 2 detik
  };

  const generateAnimationElements = () => {
    let emojis = [];
    let animName = "";

    if (item.id === "premium") {
      emojis = ['🌸', '🌷', '🌼', '🌺', '🌹', '🌻', '✨'];
      animName = 'flowerFall';
    } else if (item.id === "custom") {
      emojis = ['🎨', '🖌️', '🎀', '✨', '🪄', '💡', '💭'];
      animName = 'magicFloat';
    } else if (item.id === "delivery") {
      emojis = ['🛵', '📦', '💌', '💨', '🎁', '🎀'];
      animName = 'driveAcross';
    }

    return Array.from({ length: 15 }).map((_, i) => {
      const delay = Math.random() * 0.5;
      const size = 1 + Math.random() * 1.5;
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      
      let style = {
        animation: `${animName} 1.5s ease-in-out forwards`,
        animationDelay: `${delay}s`,
        fontSize: `${size}rem`,
      };

      if (item.id === "premium") {
        style.left = `${Math.random() * 90}%`;
        style.top = '-20px';
      } else if (item.id === "custom") {
        // Mulai dari tengah atas (di balik kotak putih yang posisinya mb-5)
        style.left = '50%';
        style.top = '30%'; 
        const explodeX = (Math.random() - 0.5) * 500; // Sebar acak ke kiri/kanan
        const explodeY = (Math.random() - 0.5) * 500; // Sebar acak ke atas/bawah
        style['--exp-x'] = `${explodeX}px`;
        style['--exp-y'] = `${explodeY}px`;
      } else if (item.id === "delivery") {
        style.top = `${Math.random() * 80}%`;
        style.left = '-30px';
      }

      return (
        <div 
          key={i} 
          className="absolute pointer-events-none select-none z-0"
          style={style}
        >
          {emoji}
        </div>
      );
    });
  };

  return (
    <div 
      onClick={handleClick}
      className={`${item.color} p-8 md:p-10 rounded-[2rem] border border-white/60 shadow-sm hover:shadow-lg hover:-translate-y-2 transition-all duration-300 text-center relative overflow-hidden cursor-pointer`}
    >
      {/* Animasi */}
      {isRaining && item.id !== 'delivery' && generateAnimationElements()}

      {/* Aksen kaca / glassmorphism di sudut */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/40 blur-xl rounded-full z-0 pointer-events-none"></div>
      
      {/* Kotak Putih Utama (z-index tinggi agar menutupi emoji saat awal muncul) */}
      <div 
        className={`w-16 h-16 md:w-20 md:h-20 mx-auto bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm flex items-center justify-center text-3xl md:text-4xl mb-5 relative z-20 transition-transform ${
          item.id !== 'delivery' ? 'hover:scale-110' : ''
        }`}
      >
        <span className={isRaining && item.id === 'delivery' ? 'animate-scooter block' : 'block'}>
          {item.emoji}
        </span>
      </div>
      <h4 className={`text-xl font-bold mb-3 relative z-10 ${item.text}`}>{item.title}</h4>
      <p className="text-charcoal/70 leading-relaxed font-medium relative z-10">{item.desc}</p>
    </div>
  );
}

function FloralBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Siluet Bunga Estetik - Opacity dan warna dinaikkan agar lebih jelas */}
      <div className="absolute top-0 -left-10 text-[20rem] text-rose-300 opacity-25 rotate-12 select-none">✿</div>
      <div className="absolute top-[10%] right-[-5%] text-[25rem] text-rose-300 opacity-20 -rotate-45 select-none">❀</div>
      <div className="absolute top-[40%] -left-10 text-[28rem] text-rose-300 opacity-20 rotate-[60deg] select-none">❁</div>
      <div className="absolute bottom-[20%] right-[-10%] text-[22rem] text-rose-300 opacity-25 rotate-90 select-none">✾</div>
      <div className="absolute -bottom-10 left-[10%] text-[24rem] text-rose-300 opacity-20 -rotate-12 select-none">✽</div>
      
      {/* Siluet Putih Besar di Tengah untuk memberikan efek kedalaman (depth) */}
      <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 text-[45rem] text-white opacity-40 rotate-[30deg] select-none">✿</div>
      
      {/* Bercak warna (Glow/Ambient Light) - Intensitas dinaikkan */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-pink-300/30 rounded-full blur-[100px] mix-blend-multiply"></div>
      <div className="absolute top-[40%] right-0 w-[600px] h-[600px] bg-orange-300/30 rounded-full blur-[120px] mix-blend-multiply"></div>
      <div className="absolute bottom-0 left-[20%] w-[500px] h-[500px] bg-rose-300/30 rounded-full blur-[100px] mix-blend-multiply"></div>
    </div>
  );
}

export default function About() {
  return (
    <section id="about" className="py-24 bg-blush relative overflow-hidden">
      <FloralBackground />
      <style>
        {`
          @keyframes flowerFall {
            0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
            10% { opacity: 1; }
            80% { opacity: 1; }
            100% { transform: translateY(300px) rotate(360deg); opacity: 0; }
          }
          @keyframes magicFloat {
            0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
            30% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
            60% { transform: translate(calc(-50% + (var(--exp-x) * 0.2)), calc(-50% + (var(--exp-y) * 0.2))) scale(1) rotate(45deg); opacity: 1; }
            100% { transform: translate(calc(-50% + var(--exp-x)), calc(-50% + var(--exp-y))) scale(1.5) rotate(180deg); opacity: 0; }
          }
          @keyframes crazyScooter {
            0% { transform: translate(0, 0); }
            20% { transform: translate(-250px, 0); } 
            21% { transform: translate(250px, 60px); } 
            50% { transform: translate(-250px, 60px); } 
            51% { transform: translate(250px, 120px); } 
            80% { transform: translate(-250px, 120px); } 
            81% { transform: translate(250px, 0); } 
            100% { transform: translate(0, 0); } 
          }
          .animate-scooter {
            animation: crazyScooter 2s linear forwards;
          }
        `}
      </style>
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-rose-brand text-sm tracking-[0.25em] uppercase font-medium mb-3">Tentang Kami</p>
          <h2 className="font-display text-4xl md:text-5xl text-charcoal font-bold mb-5">
            Jalé Florist
          </h2>
          <div className="w-16 h-0.5 bg-rose-brand mx-auto mb-6" />
          <p className="text-muted text-lg max-w-2xl mx-auto leading-relaxed">
            Florist lokal Bandung yang menghadirkan berbagai rangkaian bunga cantik dan unik 
            sebagai gift dan pelengkap momen spesialmu. Setiap rangkaian dibuat dengan 
            <em className="text-charcoal not-italic font-medium"> penuh cinta dan perhatian</em>.
          </p>
        </div>

        {/* Filosofi & Tagline */}
        <div className="mb-20 md:mb-24 bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 rounded-[2rem] md:rounded-[3rem] p-8 md:p-16 text-center shadow-sm border border-white relative overflow-hidden group">
          {/* Dekorasi lucu */}
          <div className="absolute top-8 left-8 text-4xl md:text-5xl opacity-40 group-hover:rotate-12 transition-transform duration-500">🌸</div>
          <div className="absolute bottom-8 right-8 text-4xl md:text-5xl opacity-40 group-hover:-rotate-12 transition-transform duration-500">✨</div>
          <div className="absolute top-1/2 right-10 text-3xl opacity-30 group-hover:scale-110 transition-transform duration-500">🦋</div>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/60 blur-3xl rounded-full"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/60 blur-3xl rounded-full"></div>
          
          <h3 className="font-display text-4xl md:text-5xl lg:text-6xl text-rose-brand font-bold mb-6 italic leading-tight relative z-10">
            "Handle with care, <br className="hidden md:block" />happiness inside."
          </h3>
          <p className="text-charcoal/80 text-base md:text-xl max-w-3xl mx-auto leading-relaxed relative z-10 font-medium">
            Berawal dari kecintaan sederhana terhadap keindahan bunga, Jalé Florist hadir bukan sekadar untuk menjual buket. Kami percaya bahwa setiap tangkai bunga memiliki bahasanya sendiri untuk menyampaikan perasaan yang tak terucapkan. Bagi kami, merangkai bunga adalah seni merangkai kebahagiaan untuk momen paling berharga dalam hidup Anda.
          </p>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-20 md:mb-24">
          {[
            { 
              num: '100+', 
              label: 'Desain Unik & Lucu',
              color: 'from-blue-500 to-blue-400',
              icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              )
            },
            { 
              num: <span className="text-[1.35rem] md:text-2xl">Berbagai</span>, 
              label: 'Ukuran & Custom Size',
              color: 'from-fuchsia-500 to-fuchsia-400',
              icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )
            },
            { 
              num: '10,000+', 
              label: 'Produk Terjual',
              color: 'from-emerald-500 to-emerald-400',
              icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              )
            },
            { 
              num: '5.0', 
              label: 'Rating Google Maps',
              color: 'from-amber-500 to-orange-400',
              icon: (
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              )
            },
          ].map((item, index) => (
            <div 
              key={index} 
              className={`relative overflow-hidden group p-5 md:p-6 rounded-3xl bg-gradient-to-br ${item.color} shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col items-center text-center border border-white/20`}
            >
              {/* Dekorasi blur di background */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/20 blur-2xl rounded-full group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
              
              <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/20 text-white backdrop-blur-md flex items-center justify-center mb-3 md:mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300 relative z-10`}>
                {item.icon}
              </div>
              <div className="relative z-10">
                <p className={`font-display text-2xl md:text-3xl font-bold mb-1 flex items-center justify-center gap-1 text-white`}>
                  {item.num}
                  {item.label === 'Rating Google Maps' && <span className="text-lg md:text-xl text-amber-200">★</span>}
                </p>
                <p className="text-xs md:text-sm font-medium text-white/90">{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Mengapa Memilih Kami */}
        <div className="mb-20 md:mb-24">
          <div className="text-center mb-10 md:mb-14">
            <h3 className="font-display text-3xl md:text-4xl font-bold text-charcoal">Kenapa Jalé Florist?</h3>
            <p className="text-muted mt-3 text-lg">Alasan kenapa ribuan pelanggan mempercayakan momen spesialnya pada kami.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              { id: "premium", title: "Bunga Premium", desc: "Kami hanya menggunakan bunga segar harian kualitas terbaik dan artificial import yang persis seperti aslinya.", emoji: "🌷", color: "bg-blue-50", text: "text-blue-700" },
              { id: "custom", title: "Custom Suka-Suka", desc: "Punya referensi dari Pinterest? Tim florist kami siap mewujudkan rangkaian bunga impian sesuai budgetmu.", emoji: "🎨", color: "bg-amber-50", text: "text-amber-700" },
              { id: "delivery", title: "Pengiriman Aman", desc: "Packing super tebal dan kurir khusus memastikan bunga sampai ke tangan orang tersayang tanpa lecet sedikitpun.", emoji: "🛵", color: "bg-emerald-50", text: "text-emerald-700" },
            ].map((item, i) => (
              <FeatureCard key={i} item={item} />
            ))}
          </div>
        </div>

        {/* Layanan & Spesialisasi */}
        <div className="mb-24 md:mb-32">
          <div className="text-center mb-8 md:mb-12">
            <h3 className="font-display text-3xl md:text-4xl font-bold text-charcoal">Spesialisasi Kami</h3>
            <p className="text-muted mt-2 md:mt-3 text-base md:text-lg">Lebih dari sekadar buket, kami siap melengkapi semua kebutuhan event Anda.</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-2 md:gap-4 max-w-4xl mx-auto px-2">
            {[
              { name: "Bouquet Artificial", color: "bg-pink-100/80 text-pink-700 hover:bg-pink-200" },
              { name: "Fresh Flowers", color: "bg-rose-100/80 text-rose-700 hover:bg-rose-200" },
              { name: "Bloom Box", color: "bg-purple-100/80 text-purple-700 hover:bg-purple-200" },
              { name: "Snack & Gift Bucket", color: "bg-orange-100/80 text-orange-700 hover:bg-orange-200" },
              { name: "Money Bucket", color: "bg-green-100/80 text-green-700 hover:bg-green-200" },
              { name: "Wedding Arrangement", color: "bg-teal-100/80 text-teal-700 hover:bg-teal-200" },
              { name: "Standing Flower", color: "bg-blue-100/80 text-blue-700 hover:bg-blue-200" },
              { name: "Decoration", color: "bg-amber-100/80 text-amber-700 hover:bg-amber-200" },
            ].map((srv, i) => (
              <span key={i} className={`${srv.color} px-4 md:px-8 py-2 md:py-4 rounded-full text-[13px] md:text-base font-bold shadow-sm transition-all duration-300 hover:-translate-y-1 cursor-default border border-white/50 text-center`}>
                {srv.name}
              </span>
            ))}
          </div>
        </div>

        {/* Galeri Toko */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h3 className="text-2xl font-bold text-charcoal">Mengintip Suasana Toko Kami</h3>
            <p className="text-muted mt-2">Kunjungi studio kami untuk melihat langsung koleksi bunga segar dan artificial terbaik.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 px-4 md:px-0">
            <div className="h-64 md:h-80 rounded-2xl overflow-hidden shadow-sm group md:-translate-y-4">
              <img src="/images/toko/foto_toko.jpeg" alt="Toko Jalé Florist Depan" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            </div>
            <div className="h-64 md:h-80 rounded-2xl overflow-hidden shadow-sm group md:translate-y-4">
              <img src="/images/toko/foto_toko2.jpeg" alt="Suasana Jalé Florist" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            </div>
            <div className="h-64 md:h-80 rounded-2xl overflow-hidden shadow-sm group md:-translate-y-4">
              <img src="/images/toko/foto_toko3.jpeg" alt="Koleksi Jalé Florist" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            </div>
          </div>
        </div>

        {/* Lokasi & Kontak */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Info Cards */}
          <div className="flex flex-col gap-4">
            <h3 className="text-2xl font-bold text-charcoal mb-2">Informasi & Kontak</h3>
            {infoItems.map((item) => {
              const CardTag = item.href ? 'a' : 'div';
              return (
                <CardTag
                  key={item.label}
                  href={item.href}
                  target={item.href ? "_blank" : undefined}
                  rel={item.href ? "noopener noreferrer" : undefined}
                  className={`group flex items-center gap-5 p-4 md:p-5 rounded-2xl border transition-all duration-300 ${item.theme.bg} ${item.theme.border} ${
                    item.href ? 'cursor-pointer hover:-translate-y-1 hover:shadow-md' : 'shadow-sm'
                  }`}
                >
                  <div className={`flex-shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm ${item.theme.iconBg} ${item.theme.text} ${item.theme.hoverText}`}>
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] mb-1 opacity-80 ${item.theme.text}`}>{item.label}</p>
                    <p className="text-charcoal font-bold text-sm md:text-base leading-snug">{item.value}</p>
                  </div>
                  {item.href && (
                    <div className={`transition-all duration-300 ${item.theme.text} opacity-50 group-hover:opacity-100`}>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </CardTag>
              );
            })}
          </div>

          {/* Google Maps Embed */}
          <div className="flex flex-col gap-4 h-full">
            <h3 className="text-xl font-bold text-charcoal mb-2">Lokasi Kami</h3>
            <div className="w-full h-64 lg:h-[calc(100%-2.5rem)] min-h-[300px] rounded-2xl overflow-hidden shadow-sm bg-cream">
              <iframe 
                src="https://maps.google.com/maps?q=Jal%C3%A9%20Florist,%20Bandung&t=&z=15&ie=UTF8&iwloc=&output=embed" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen="" 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="Google Maps Jalé Florist"
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
