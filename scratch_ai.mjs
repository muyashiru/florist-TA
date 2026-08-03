import { askQwenAI } from './server/ai.js';
askQwenAI('test', 'halo').then(console.log).catch(console.error);
