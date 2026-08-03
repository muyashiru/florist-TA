const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'jale_florist_ta'
  });

  // Randomly delete the last admin message from 25 contacts to force an unresolved escalation
  const [rows] = await conn.query("SELECT no_wa FROM contacts WHERE no_wa LIKE '%_DUMMY' ORDER BY RAND() LIMIT 25");
  for (let row of rows) {
    await conn.query("DELETE FROM messages WHERE no_wa = ? AND sender = 'admin' ORDER BY created_at DESC LIMIT 1", [row.no_wa]);
  }

  // Update AI status for any contact whose last message is an escalation
  const [contacts] = await conn.query("SELECT c.no_wa, (SELECT message_text FROM messages m WHERE m.no_wa = c.no_wa ORDER BY created_at DESC LIMIT 1) as last_msg FROM contacts c WHERE c.no_wa LIKE '%_DUMMY'");
  
  let updated = 0;
  for (let c of contacts) {
    if (c.last_msg && c.last_msg.startsWith('[ESCALATION]')) {
      await conn.query("UPDATE contacts SET is_ai_active = 0 WHERE no_wa = ?", [c.no_wa]);
      updated++;
    }
  }

  console.log('Fixed escalations! Updated', updated, 'contacts to AI Off.');
  process.exit(0);
})();
