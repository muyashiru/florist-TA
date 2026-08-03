import { db } from './server/db.js';
import { askQwenAI } from './server/ai.js';
(async () => {
    try {
        const res = await askQwenAI('211368393318406@lid', 'halo');
        console.log(res);
        process.exit(0);
    } catch(e) {
        console.error(e);
    }
})();
