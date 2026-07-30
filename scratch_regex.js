const text = `Hari dan Waktu pengantaran/pengambilan : Minggu, 2 Agustus 2026 jam 12:00 WIB`;
const timeMatch = text.match(/Waktu pengantaran(?:.*?):\s*([^\n]+)/i);
let deliveryTimeText = null;
if (timeMatch && timeMatch[1]) {
    deliveryTimeText = timeMatch[1].trim();
}
console.log("Extracted deliveryTimeText:", deliveryTimeText);

let parsedDeliveryType = "now";
let parsedDeliveryDate = undefined;
let parsedDeliveryTime = undefined;

if (deliveryTimeText) {
    const months = { 'januari': '01', 'februari': '02', 'maret': '03', 'april': '04', 'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08', 'september': '09', 'oktober': '10', 'november': '11', 'desember': '12' };
    const dateMatch = deliveryTimeText.match(/(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/i);
    const timeMatch2 = deliveryTimeText.match(/(\d{2})[.:](\d{2})/);
    
    if (dateMatch && timeMatch2) {
        const d = dateMatch[1].padStart(2, '0');
        const m = months[dateMatch[2].toLowerCase()] || '01';
        const y = dateMatch[3];
        
        parsedDeliveryDate = `${y}-${m}-${d}`;
        parsedDeliveryTime = `${timeMatch2[1]}:${timeMatch2[2]}`;
        parsedDeliveryType = "later";
    }
}
console.log({ parsedDeliveryType, parsedDeliveryDate, parsedDeliveryTime });
