import fs from 'fs';

const path = 'd:\\Projectku\\florist - TA\\server\\index.js';
let content = fs.readFileSync(path, 'utf8');

const startTag = "app.get('/sandbox'";
const startIndex = content.indexOf(startTag);

if (startIndex === -1) {
    console.error("HTML boundary not found!");
    process.exit(1);
}

// Keep everything before app.get('/sandbox'
content = content.substring(0, startIndex);

const newHtml = `app.get('/sandbox', (req, res) => {
    res.send(\`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8"><title>🧪 Sandbox AI - Jalé Florist</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            * { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
            .chat-bg { background-image: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png'); background-size: contain; }
            
            .msg-wrapper { display: flex; width: 100%; margin-bottom: 5px; }
            .msg { padding: 8px 12px; border-radius: 8px; max-width: 70%; font-size: 14.5px; line-height: 20px; position: relative; box-shadow: 0 1px 1px rgba(11,20,26,0.1); word-wrap: break-word; color: #111b21; }
            
            .msg.user { background: #d9fdd3; margin-left: auto; border-top-right-radius: 0; }
            .msg.user::before { content: ""; position: absolute; top: 0; right: -8px; width: 0; height: 0; border-top: 0px solid transparent; border-left: 8px solid #d9fdd3; border-bottom: 10px solid transparent; }
            
            .msg.ai { background: #ffffff; margin-right: auto; border-top-left-radius: 0; }
            .msg.ai::before { content: ""; position: absolute; top: 0; left: -8px; width: 0; height: 0; border-top: 0px solid transparent; border-right: 8px solid #ffffff; border-bottom: 10px solid transparent; }
            
            .msg.admin { background: #fff3cd; margin-right: auto; border-top-left-radius: 0; border-left: 4px solid #f39c12; }
            .msg.admin::before { content: ""; position: absolute; top: 0; left: -8px; width: 0; height: 0; border-top: 0px solid transparent; border-right: 8px solid #f39c12; border-bottom: 10px solid transparent; }
            
            .msg-sender { font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #00a884; }
            .msg.admin .msg-sender { color: #d35400; }

            .custom-select-wrapper.open .custom-select { border-color: #00a884; box-shadow: 0 0 0 4px rgba(0, 168, 132, 0.15); }
            .custom-select-wrapper.open .custom-select svg { transform: rotate(180deg); }
            .custom-select-options { opacity: 0; visibility: hidden; transform: translateY(-10px); transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
            .custom-select-wrapper.open .custom-select-options { opacity: 1; visibility: visible; transform: translateY(0); }
            .custom-select-options::-webkit-scrollbar { width: 6px; }
            .custom-select-options::-webkit-scrollbar-track { background: transparent; }
            .custom-select-options::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
        </style>
    </head>
    <body class="m-0 bg-[#e5ddd5] flex items-center justify-center h-screen overflow-hidden">
        <div class="w-full max-w-5xl flex bg-white shadow-2xl overflow-hidden h-[95vh] rounded-[20px]">
            <!-- LEFT PANEL -->
            <div class="w-[320px] bg-slate-50 flex flex-col border-r border-slate-300">
                <div class="bg-emerald-600 text-white p-6 text-center font-semibold text-xl flex flex-col gap-1">
                    🧪 Sandbox AI 
                    <span class="text-[13px] font-normal opacity-90">Jalé Florist Testing Mode</span>
                </div>
                <div class="p-6 flex flex-col gap-4 h-full relative z-10">
                    <div class="relative w-full custom-select-wrapper" id="scenarioDropdownWrapper">
                        <div class="flex justify-between items-center px-4 py-3.5 border-2 border-slate-200 rounded-xl bg-white cursor-pointer text-slate-800 font-semibold text-sm transition-all shadow-sm custom-select hover:border-slate-300" id="customSelectLabel" onclick="toggleDropdown()">
                            <span class="truncate">-- Pilih Skenario --</span>
                            <svg class="w-[18px] h-[18px] min-w-[18px] transition-transform stroke-slate-500" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                        <ul class="absolute top-[calc(100%+8px)] left-0 right-0 bg-white rounded-xl shadow-lg border border-slate-200 max-h-[250px] overflow-y-auto custom-select-options list-none p-1.5 m-0 z-50" id="scenarioList">
                            <!-- Options akan diisi oleh JS -->
                        </ul>
                    </div>
                    <input type="hidden" id="scenarioSelect" value="">
                    <button onclick="loadScenario()" class="px-4 py-3.5 rounded-lg font-semibold text-sm text-white transition-all shadow-sm bg-teal-700 hover:-translate-y-px hover:shadow-md active:translate-y-px">📂 Muat Skenario</button>
                    <button onclick="saveScenario()" class="px-4 py-3.5 rounded-lg font-semibold text-sm text-slate-900 transition-all shadow-sm bg-[#25D366] hover:-translate-y-px hover:shadow-md active:translate-y-px">💾 Simpan Skenario Ini</button>
                    
                    <button onclick="resetChat()" class="px-4 py-3.5 rounded-lg font-semibold text-sm text-white transition-all shadow-sm bg-red-500 hover:-translate-y-px hover:shadow-md active:translate-y-px mt-auto">🗑️ Reset Obrolan</button>
                </div>
            </div>

            <!-- RIGHT PANEL -->
            <div class="flex-1 flex flex-col bg-[#efeae2] relative z-0">
                <div class="bg-slate-50 py-3 px-5 flex items-center gap-4 border-b border-slate-300">
                    <div class="w-11 h-11 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg">J</div>
                    <div class="flex flex-col">
                        <div class="font-bold text-[16px] text-[#111b21]">Jalé Florist</div>
                        <div class="text-[13px] text-[#667781]">online (AI Assistant Active)</div>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto p-7 flex flex-col gap-3 chat-bg" id="chatBox">
                    <div class="msg-wrapper"><div class="msg ai"><div class="msg-sender">~ AI Assistant</div>🤖 Halo! Saya AI Jalé Florist di dalam mode Sandbox. Mau tes tanya apa hari ini? 🌸</div></div>
                </div>
                
                <div class="bg-slate-50 py-3 px-5 flex gap-3 items-center border-t border-slate-300">
                    <input type="file" id="photoInput" accept="image/*" style="display:none;" onchange="sendPhoto(event)">
                    <button onclick="document.getElementById('photoInput').click()" class="w-11 h-11 rounded-full border-none cursor-pointer flex items-center justify-center bg-transparent transition-all text-[#54656f] hover:bg-slate-200 hover:text-emerald-600" title="Kirim Foto">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M21.2 7.2H17l-1.5-1.5c-.3-.3-.7-.5-1.1-.5h-4.8c-.4 0-.8.2-1.1.5L7 7.2H2.8c-.4 0-.8.3-.8.8v11.2c0 .4.4.8.8.8h18.4c.4 0 .8-.4.8-.8V8c0-.5-.3-.8-.8-.8zm-9.2 10c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5zm0-8.5c-1.9 0-3.5 1.6-3.5 3.5s1.6 3.5 3.5 3.5 3.5-1.6 3.5-3.5-1.6-3.5-3.5-3.5z"></path></svg>
                    </button>
                    <textarea id="msgInput" rows="1" placeholder="Ketik pesan pelanggan..." class="flex-1 py-3 px-4 border-none rounded-3xl resize-none outline-none text-[15px] max-h-[100px] bg-white shadow-sm placeholder-[#8696a0]" onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault(); sendMsg();}"></textarea>
                    <button onclick="sendMsg()" id="btnSend" class="w-10 h-10 rounded-full border-none cursor-pointer flex items-center justify-center transition-all bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105 p-2.5">
                        <svg class="w-full h-full fill-current" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
                    </button>
                </div>
            </div>
        </div>

        <script>
            let lastMessageCount = 0;

            async function fetchScenarios() {
                const res = await fetch('/api/scenarios');
                const data = await res.json();
                const list = document.getElementById('scenarioList');
                list.innerHTML = '<li class="px-3 py-3 rounded-lg cursor-pointer text-[13.5px] text-slate-700 transition-colors border-b border-transparent mb-0.5 hover:bg-slate-100 hover:text-slate-900" onclick="selectOption(\\'NEW\\', \\'✨ -- Mulai Skenario Baru (Kosong) --\\')">✨ -- Mulai Skenario Baru (Kosong) --</li>';
                if(data.scenarios) {
                    data.scenarios.forEach(s => {
                        const escapedName = s.name.replace(/'/g, "\\\\\\'").replace(/"/g, '&quot;');
                        list.innerHTML += '<li class="px-3 py-3 rounded-lg cursor-pointer text-[13.5px] text-slate-700 transition-colors border-b border-transparent mb-0.5 hover:bg-slate-100 hover:text-slate-900" onclick="selectOption(\\\''+s.id+'\\\', \\\''+escapedName+'\\\')">'+s.name+'</li>';
                    });
                }
            }
            
            function toggleDropdown() {
                document.getElementById('scenarioDropdownWrapper').classList.toggle('open');
            }
            
            function selectOption(value, label) {
                document.getElementById('scenarioSelect').value = value;
                document.querySelector('#customSelectLabel span').innerText = label;
                document.getElementById('scenarioDropdownWrapper').classList.remove('open');
            }
            
            document.addEventListener('click', function(e) {
                const wrapper = document.getElementById('scenarioDropdownWrapper');
                if (wrapper && !wrapper.contains(e.target)) {
                    wrapper.classList.remove('open');
                }
            });

            async function saveScenario() {
                const name = prompt("Masukkan nama skenario ini:");
                if(!name) return;
                const reqRes = await fetch('/api/scenarios', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name}) });
                const reqData = await reqRes.json();
                if (!reqData.success) { alert('Gagal menyimpan: ' + reqData.message); return; }
                alert('Skenario berhasil disimpan! Memori akan direset untuk skenario baru.');
                fetchScenarios();
                await fetch('/api/reset-chat', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({}) });
                fetchHistory();
            }
            
            async function loadScenario() {
                const id = document.getElementById('scenarioSelect').value;
                if(!id) return alert('Pilih skenario dulu!');
                if(id === 'NEW') { resetChat(); return; }
                if(!confirm('Load skenario ini? Obrolan saat ini akan tertimpa.')) return;
                const res = await fetch('/api/scenarios/'+id+'/load', { method: 'POST' });
                const data = await res.json();
                if(data.success) {
                    renderHistory(data.messages);
                    alert('Skenario berhasil diload!');
                }
            }

            async function fetchHistory() {
                const res = await fetch('/api/sandbox-history');
                const data = await res.json();
                if (data.success) {
                    if (data.messages.length !== lastMessageCount) {
                        renderHistory(data.messages);
                        lastMessageCount = data.messages.length;
                    }
                }
            }

            function renderHistory(messages) {
                const box = document.getElementById('chatBox');
                box.innerHTML = '';
                if(messages.length === 0) {
                    box.innerHTML = '<div class="msg-wrapper"><div class="msg ai"><div class="msg-sender">AI Assistant</div>🤖 Memori percakapan Sandbox telah direset! Mau tes skenario apa sekarang? 🌸</div></div>';
                    return;
                }

                messages.forEach(m => {
                    const isUser = m.sender === 'customer';
                    const cssClass = isUser ? 'user' : (m.sender === 'admin' ? 'admin' : 'ai');
                    const senderName = isUser ? '' : (m.sender === 'admin' ? '<div class="msg-sender">~ Human Agent (Admin)</div>' : '<div class="msg-sender">~ AI Assistant</div>');
                    
                    let displayMsg = m.message_text.replace(/\\n/g, '<br/>');
                    
                    if(displayMsg.includes('[IMAGE]')) {
                        const parts = displayMsg.split('[IMAGE]');
                        displayMsg = parts[0] + '<br/><img src="'+parts[1]+'" style="max-width: 200px; border-radius: 8px; display:block; margin-top: 8px;" />';
                    }
                    if(displayMsg.includes('[KATALOG]')) {
                        displayMsg = displayMsg.split('[KATALOG]')[0];
                    }
                    if(displayMsg.includes('[ESCALATION]')) {
                        let cleanMsg = displayMsg.replace('[ESCALATION]', '').trim();
                        let alasanMatch = cleanMsg.match(/Alasan:\\s*(.*?)(?=\\s*\\|\\s*Draft:|$)/is);
                        let alasan = alasanMatch ? alasanMatch[1].replace(/\\[HANDOFF\\]|\\[SILENT_HANDOFF\\]/g, '').trim() : cleanMsg.replace(/\\[HANDOFF\\]|\\[SILENT_HANDOFF\\]/g, '').trim();
                        displayMsg = '<div style="color:#d35400; font-weight:bold; font-size:12px; margin-bottom:5px;">🚨 AI BERHENTI (ESKALASI)</div><div style="font-size:13px; color:#e67e22;"><b>Alasan:</b> ' + alasan + '</div><div style="font-size:11px; margin-top:5px; color:#7f8c8d;">(Di WhatsApp asli, pesan ini tidak terkirim ke customer)</div>';
                    }

                    box.innerHTML += '<div class="msg-wrapper"><div class="msg ' + cssClass + '">' + senderName + displayMsg + '</div></div>';
                });
                box.scrollTop = box.scrollHeight;
            }

            fetchScenarios();
            fetchHistory();
            setInterval(fetchHistory, 2000);

            let isProcessing = false;

            async function resetChat() {
                if (!confirm('Hapus riwayat percakapan Sandbox agar mulai dari awal?')) return;
                await fetch('/api/reset-chat', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({}) });
                fetchHistory();
            }
            
            async function sendPhoto(e) {
                if (isProcessing) return;
                const file = e.target.files[0];
                if (!file) return;
                let caption = prompt("Masukkan pesan/keterangan untuk dikirim bersama foto ini (opsional):");
                if (caption === null) return; 
                caption = caption.trim();
                
                const url = URL.createObjectURL(file);
                const box = document.getElementById('chatBox');
                
                const displayText = caption ? '[Gambar] ' + caption : '[Gambar]';
                const aiMessage = caption ? '[Mengirimkan Foto] ' + caption : '[Mengirimkan Foto]';
                
                box.innerHTML += '<div class="msg-wrapper"><div class="msg user"><img src="' + url + '" style="max-width: 200px; border-radius: 8px; display:block; margin-bottom: 5px;" />' + displayText.split('\\n').join('<br/>') + '</div></div>';
                box.scrollTop = box.scrollHeight;
                await processAiRequest(aiMessage);
            }
            
            async function sendMsg() {
                if (isProcessing) return;
                const input = document.getElementById('msgInput');
                const text = input.value.trim();
                if(!text) return;
                
                document.getElementById('chatBox').innerHTML += '<div class="msg-wrapper"><div class="msg user">' + text.split('\\n').join('<br/>') + '</div></div>';
                input.value = '';
                document.getElementById('chatBox').scrollTop = document.getElementById('chatBox').scrollHeight;
                
                await processAiRequest(text);
            }
            
            async function processAiRequest(text) {
                isProcessing = true;
                const box = document.getElementById('chatBox');
                const btn = document.getElementById('btnSend');
                const loadingId = 'load_' + Date.now();
                
                box.innerHTML += '<div class="msg-wrapper" id="' + loadingId + '"><div class="msg ai"><div class="msg-sender">~ AI Assistant</div>🤖 Sedang mengetik...</div></div>';
                box.scrollTop = box.scrollHeight;
                btn.disabled = true;

                try {
                    await fetch('/api/test-ai', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: text })
                    });
                    setTimeout(fetchHistory, 500);
                } catch(e) {
                    document.getElementById(loadingId).innerHTML = '<div class="msg-wrapper"><div class="msg ai">❌ Gagal: ' + e.message + '</div></div>';
                }
                btn.disabled = false;
                isProcessing = false;
            }
            
            document.getElementById('msgInput').addEventListener('paste', async function(e) {
                if (isProcessing) return;
                const items = (e.clipboardData || e.originalEvent.clipboardData).items;
                for (const item of items) {
                    if (item.type.indexOf('image') === 0) {
                        e.preventDefault();
                        const file = item.getAsFile();
                        if (file) {
                            let caption = prompt("Masukkan pesan/keterangan untuk dikirim bersama foto ini (opsional):");
                            if (caption === null) return; 
                            caption = caption.trim();
                            
                            const url = URL.createObjectURL(file);
                            const box = document.getElementById('chatBox');
                            
                            const displayText = caption ? '[Gambar] ' + caption : '[Gambar]';
                            const aiMessage = caption ? '[Mengirimkan Foto] ' + caption : '[Mengirimkan Foto]';
                            
                            box.innerHTML += '<div class="msg-wrapper"><div class="msg user"><img src="' + url + '" style="max-width: 200px; border-radius: 8px; display:block; margin-bottom: 5px;" />' + displayText.split('\\n').join('<br/>') + '</div></div>';
                            box.scrollTop = box.scrollHeight;
                            await processAiRequest(aiMessage);
                        }
                        break;
                    }
                }
            });
        </script>
    </body>
    </html>
    \`);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(\`🚀 Server Backend berjalan di http://localhost:\${PORT}\`);
    console.log(\`🧪 MODE SANDBOX AKTIF: Buka http://localhost:\${PORT}/sandbox di browser Anda!\`);
    connectToWhatsApp(); // Menyalakan klien WhatsApp Web via Baileys
});
`

content = content + newHtml;
fs.writeFileSync(path, content);
console.log('done!');
