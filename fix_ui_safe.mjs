import fs from 'fs';
const path = './server/index.js';
let content = fs.readFileSync(path, 'utf8');

const htmlStart = `<style>
            * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }`;
const htmlEnd = `</div>
        </div>

        <script>`;

const startIndex = content.indexOf(htmlStart);
const endIndex = content.indexOf(htmlEnd);

if (startIndex === -1 || endIndex === -1) {
    console.error("HTML boundary not found!");
    process.exit(1);
}

const newHtml = `<script src="https://cdn.tailwindcss.com"></script>
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
        <div class="w-full max-w-[1000px] flex bg-white shadow-2xl overflow-hidden h-[95vh] rounded-[20px]">
            <!-- LEFT PANEL -->
            <div class="w-[320px] bg-[#f0f2f5] flex flex-col border-r border-[#d1d7db]">
                <div class="bg-[#00a884] text-white p-6 text-center font-semibold text-[20px] flex flex-col gap-1">
                    🧪 Sandbox AI 
                    <span class="text-[13px] font-normal opacity-90">Jalé Florist Testing Mode</span>
                </div>
                <div class="p-6 flex flex-col gap-[15px] h-full relative z-10">
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
                    <button onclick="loadScenario()" class="px-[14px] py-[14px] rounded-lg font-semibold text-[14px] text-white transition-all shadow-md bg-[#008069] hover:-translate-y-px hover:shadow-lg active:translate-y-px border-none cursor-pointer">📂 Muat Skenario</button>
                    <button onclick="saveScenario()" class="px-[14px] py-[14px] rounded-lg font-semibold text-[14px] text-[#111b21] transition-all shadow-md bg-[#25D366] hover:-translate-y-px hover:shadow-lg active:translate-y-px border-none cursor-pointer">💾 Simpan Skenario Ini</button>
                    
                    <button onclick="resetChat()" class="px-[14px] py-[14px] rounded-lg font-semibold text-[14px] text-white transition-all shadow-md bg-[#ef4444] hover:-translate-y-px hover:shadow-lg active:translate-y-px mt-auto border-none cursor-pointer">🗑️ Reset Obrolan</button>
                </div>
            </div>

            <!-- RIGHT PANEL -->
            <div class="flex-1 flex flex-col bg-[#efeae2] relative z-0">
                <div class="bg-[#f0f2f5] py-3 px-5 flex items-center gap-[15px] border-b border-[#d1d7db]">
                    <div class="w-[42px] h-[42px] bg-[#00a884] rounded-full flex items-center justify-center text-white font-bold text-[18px]">J</div>
                    <div class="flex flex-col">
                        <div class="font-semibold text-[16px] text-[#111b21]">Jalé Florist</div>
                        <div class="text-[13px] text-[#667781]">online (AI Assistant Active)</div>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto p-[30px] flex flex-col gap-3 chat-bg" id="chatBox">
                    <div class="msg-wrapper"><div class="msg ai"><div class="msg-sender">~ AI Assistant</div>🤖 Halo! Saya AI Jalé Florist di dalam mode Sandbox. Mau tes tanya apa hari ini? 🌸</div></div>
                </div>
                
                <div class="bg-[#f0f2f5] py-3 px-5 flex gap-3 items-center border-t border-[#d1d7db]">
                    <input type="file" id="photoInput" accept="image/*" style="display:none;" onchange="sendPhoto(event)">
                    <button onclick="document.getElementById('photoInput').click()" class="w-[44px] h-[44px] rounded-full border-none cursor-pointer flex items-center justify-center bg-transparent transition-all text-[#54656f] hover:bg-[#e5e7eb] hover:text-[#00a884]" title="Kirim Foto">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M21.2 7.2H17l-1.5-1.5c-.3-.3-.7-.5-1.1-.5h-4.8c-.4 0-.8.2-1.1.5L7 7.2H2.8c-.4 0-.8.3-.8.8v11.2c0 .4.4.8.8.8h18.4c.4 0 .8-.4.8-.8V8c0-.5-.3-.8-.8-.8zm-9.2 10c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5zm0-8.5c-1.9 0-3.5 1.6-3.5 3.5s1.6 3.5 3.5 3.5 3.5-1.6 3.5-3.5-1.6-3.5-3.5-3.5z"></path></svg>
                    </button>
                    <textarea id="msgInput" rows="1" placeholder="Ketik pesan pelanggan..." class="flex-1 py-3 px-[18px] border-none rounded-3xl resize-none outline-none text-[15px] max-h-[100px] bg-white shadow-sm placeholder-[#8696a0]" onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault(); sendMsg();}"></textarea>
                    <button onclick="sendMsg()" id="btnSend" class="w-[40px] h-[40px] rounded-full border-none cursor-pointer flex items-center justify-center transition-all bg-[#00a884] text-white hover:bg-[#008069] hover:scale-105 p-[10px]">
                        <svg class="w-full h-full fill-current" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
                    </button>
                </div>
            </div>
        </div>`;

content = content.substring(0, startIndex) + newHtml + content.substring(endIndex);

const oldFetchScenarios = `            async function fetchScenarios() {
                const res = await fetch('/api/scenarios');
                const data = await res.json();
                const sel = document.getElementById('scenarioSelect');
                sel.innerHTML = '<option value="">-- Pilih Skenario Tersimpan --</option><option value="NEW">✨ -- Mulai Skenario Baru (Kosong) --</option>';
                if(data.scenarios) {
                    data.scenarios.forEach(s => {
                        sel.innerHTML += '<option value="'+s.id+'">'+s.name+'</option>';
                    });
                }
            }`;

const newFetchScenarios = `            async function fetchScenarios() {
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
            }`;

content = content.replace(oldFetchScenarios, newFetchScenarios);

fs.writeFileSync(path, content);
console.log('done!');
