import { askQwenAI } from './server/ai.js';
async function test() {
    console.log("Memulai simulasi AI...");
    const lastMsg = "saya mau pesan 1 BAL_012 dikirim untuk tanggal 4 agustus jam 12 siang, alamatnya Jl. H. Topek 1 No.14 (40242), nama penerima dan nomor penerimanya Refa 089932212313 notesnya : Selamat Sayang";
    const res = await askQwenAI("0895339549364_SANDBOX", lastMsg);
    console.log("HASIL AI:", res);
}
test();
