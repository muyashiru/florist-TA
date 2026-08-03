const text = `*Pesanan:* Bouquet Artificial Large 093 (BAL_093)`;
const itemMatch = text.match(/\*?(?:Produk|Item|Jenis Order|Pesanan)\*?:\*?[ \t]*([^\n]+)/i);
console.log(itemMatch ? itemMatch[1] : null);
