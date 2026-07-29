import { useEffect, useState } from 'react';
import { formatPrice } from '../utils/whatsapp';

const additionalItemsList = [
  { id: 'add_sedapmalam', name: 'Sedap Malam pink', price: 15000 },
  { id: 'add_casablanca', name: 'Casablanca Lily', price: 75000 },
  { id: 'add_babybreath', name: 'Baby breathe', price: 35000 },
  { id: 'add_mawar', name: 'Mawar', price: 7000 },
  { id: 'add_gerberalokal', name: 'Gerbera lokal', price: 4000 },
  { id: 'add_gerberasemi', name: 'Gerbera Semi', price: 8000 },
  { id: 'add_anthurium', name: 'Anthurium', price: 15000 },
  { id: 'add_carnation', name: 'Carnation', price: 5000 },
  { id: 'add_chrysanthemum', name: 'Chrysanthemum Toba', price: 20000 },
  { id: 'add_gladiol', name: 'Gladiol', price: 15000 },
  { id: 'add_aster', name: 'Aster', price: 5000 },
  { id: 'add_pikok', name: 'Pikok', price: 3500 },
  { id: 'add_solidago', name: 'Solidago', price: 4000 },
  { id: 'add_taiwanleaves', name: 'Taiwan leaves', price: 6000 },
  { id: 'add_ruskus', name: 'Ruskus', price: 2000 },
  { id: 'add_hydrangea', name: 'Hydrangea lokal', price: 10000 },
];

export default function QuickView({ product, onClose }) {
  const [addons, setAddons] = useState({});
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!product) return null;

  const addonsTotal = Object.entries(addons).reduce((total, [id, qty]) => {
    const item = additionalItemsList.find(i => i.id === id);
    return total + (item ? item.price * qty : 0);
  }, 0);

  const totalPrice = product.price + addonsTotal;

  const generateLinkWithAddons = () => {
    const phoneNumber = "62895339549364";

    let text = `Halo admin Jalé Florist, saya ingin memesan produk berikut:\n\n`;
    text += `*Produk:* ${product.name}\n`;
    text += `*Kode:* ${product.id}\n`;
    text += `*Harga Dasar:* ${formatPrice(product.price)}\n\n`;

    const selectedAddons = Object.entries(addons).filter(([_, qty]) => qty > 0);

    if (selectedAddons.length > 0) {
      text += `*Tambahan (Add-ons):*\n`;
      selectedAddons.forEach(([id, qty]) => {
        const item = additionalItemsList.find(i => i.id === id);
        if (item) {
          text += `- ${qty}x ${item.name} (${formatPrice(item.price * qty)})\n`;
        }
      });
    }

    const displayTotalWA = product.price === 0 
      ? (addonsTotal > 0 ? `Ask admin (+ ${formatPrice(addonsTotal)} untuk addons)` : "Ask admin for price")
      : formatPrice(totalPrice);

    text += `*Total Harga:* ${displayTotalWA}\n\n`;
    text += `Mohon info ketersediaan dan total biaya ongkirnya ya. Terima kasih!`;

    const baseUrl = 'https://jaleflorist.com';
    const previewUrl = `${baseUrl}/api/preview?id=${product.id}`;
    text += `\n\nLink Produk: ${previewUrl}`;

    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(text)}`;
  };

  const handleAddonChange = (id, increment) => {
    setAddons(prev => {
      const currentQty = prev[id] || 0;
      const newQty = Math.max(0, currentQty + increment);
      return { ...prev, [id]: newQty };
    });
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Zoomed Image Overlay (Mobile) */}
      {isZoomed && (
        <div 
          className="fixed inset-0 z-[1000] bg-black/95 flex flex-col items-center justify-center md:hidden"
          onClick={() => setIsZoomed(false)}
        >
          <button 
            className="absolute top-4 right-4 z-50 p-2 bg-white/10 text-white rounded-full backdrop-blur-md"
            onClick={(e) => { e.stopPropagation(); setIsZoomed(false); }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full h-auto max-h-[90vh] object-contain"
          />
          <p className="text-white/60 text-sm mt-4">Ketuk di mana saja untuk kembali</p>
        </div>
      )}

      <div
        className={`bg-cream rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] md:max-h-[90vh] flex flex-col md:flex-row relative overflow-hidden ${isZoomed ? 'hidden md:flex' : 'flex'}`}
        style={{ animation: 'modalIn 0.3s ease forwards' }}
      >
        {/* Tombol Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-charcoal shadow-md hover:scale-105 transition-all"
          aria-label="Tutup"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image */}
        <div 
          className="w-full h-[28vh] md:h-auto md:w-5/12 bg-blush flex-shrink-0 relative group md:cursor-default cursor-pointer"
          onClick={() => {
            // Hanya aktifkan zoom di mobile (layar < 768px)
            if (window.innerWidth < 768) {
              setIsZoomed(true);
            }
          }}
        >
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 md:group-hover:scale-105"
          />
          {/* Hint Zoom (Mobile only) */}
          <div className="absolute top-3 left-3 md:hidden pointer-events-none">
            <div className="bg-black/40 backdrop-blur-md px-2.5 py-1.5 rounded-full text-[10px] font-medium text-white flex items-center gap-1.5 shadow-sm">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
              Ketuk untuk zoom
            </div>
          </div>
        </div>

        {/* Details Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-6 md:p-8 custom-scrollbar">
            <p className="text-xs text-muted font-medium tracking-wider uppercase mb-1">{product.id}</p>
            <h2 className="font-display text-xl md:text-3xl text-charcoal font-bold mb-1 leading-tight">
              {product.name}
            </h2>

            {/* Availability */}
            <div className="flex items-center gap-3 mb-4 mt-2">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${product.available ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-xs text-muted">
                  {product.available ? 'Tersedia' : 'Habis'}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-muted text-xs md:text-sm leading-relaxed mb-6">
              {product.description}
            </p>

            {/* Add-ons Section (ShopeeFood Style) */}
            <div className="border-t border-sand/40 pt-4">
              <h3 className="font-bold text-charcoal text-sm md:text-base mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-rose-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Tambahkan Bunga (Opsional)
              </h3>

              <div className="space-y-4">
                {additionalItemsList.map(item => {
                  const qty = addons[item.id] || 0;
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-4 group">
                      <div className="flex-1">
                        <p className="text-sm text-charcoal font-medium group-hover:text-rose-brand transition-colors">{item.name}</p>
                        <p className="text-xs text-rose-brand font-medium">+{formatPrice(item.price)}</p>
                      </div>

                      {/* Stepper + - */}
                      <div className="flex items-center gap-3 bg-white px-1.5 py-1 rounded-full border border-sand/50 shadow-sm">
                        <button
                          onClick={() => handleAddonChange(item.id, -1)}
                          disabled={qty === 0}
                          className={`w-7 h-7 flex items-center justify-center rounded-full transition-all ${qty > 0 ? 'bg-rose-brand/10 text-rose-brand hover:bg-rose-brand hover:text-white' : 'text-gray-300 cursor-not-allowed'}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg>
                        </button>
                        <span className="text-sm font-bold w-4 text-center text-charcoal">{qty}</span>
                        <button
                          onClick={() => handleAddonChange(item.id, 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-rose-brand/10 text-rose-brand hover:bg-rose-brand hover:text-white transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Sticky Footer for Total & CTA */}
          <div className="px-5 py-4 md:px-8 border-t border-sand/40 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-end mb-3">
              <div>
                <p className="text-xs text-muted mb-0.5">Total Pembayaran</p>
                <div className="flex flex-col">
                  {addonsTotal > 0 && product.price > 0 && (
                    <span className="text-[10px] text-muted line-through opacity-70">
                      Dasar: {formatPrice(product.price)}
                    </span>
                  )}
                  <span className={`font-bold text-rose-brand leading-none ${product.price === 0 && addonsTotal === 0 ? 'text-lg md:text-xl' : 'text-xl md:text-2xl'}`}>
                    {product.price === 0 
                      ? (addonsTotal > 0 ? `Ask admin (+ ${formatPrice(addonsTotal)})` : "Ask admin for price") 
                      : formatPrice(totalPrice)}
                  </span>
                </div>
              </div>
            </div>

            <a
              href={generateLinkWithAddons()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1DA851] text-white font-bold py-3 md:py-3.5 px-4 rounded-xl md:rounded-full transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 text-sm md:text-base"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Pesan Sekarang
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #D9A299;
          border-radius: 10px;
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}
