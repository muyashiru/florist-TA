const userMessage = "Saya mau pesan artificial large 080 buat dikirim tanggal 8 agustus jam 15 siang";
let lowerMsg = userMessage.toLowerCase();
let skuMatch = userMessage.match(/[a-zA-Z]{2,6}[_\-\s]?[0-9]{2,4}/g);

console.log("skuMatch:", skuMatch);
if (skuMatch && skuMatch.length > 0) {
    const uniqueSkus = [...new Set(skuMatch.map(s => {
        return s.replace(/[^a-zA-Z0-9]/g, '').replace(/([a-zA-Z]+)([0-9]+)/, '$1_$2').toUpperCase();
    }))];
    console.log("uniqueSkus:", uniqueSkus);
}
