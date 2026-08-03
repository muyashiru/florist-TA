export const WHATSAPP_NUMBER = "62895402765380";

export const formatPrice = (price) => {
  if (price === 0) return "Ask admin for price";
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(price);
};

export const generateOrderLink = (product) => {
  const baseUrl = 'https://jaleflorist.com';
  const previewUrl = `${baseUrl}/api/preview?id=${product.id}`;

  const msg = `Halo Jalé Florist, saya tertarik memesan ${product.name} (Kode: ${product.id}) seharga ${formatPrice(product.price)}. Apakah masih tersedia? Terima kasih!\n\nLink Produk: ${previewUrl}`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
};

export const getWhatsAppLink = () => `https://wa.me/${WHATSAPP_NUMBER}`;
