import mysql from 'mysql2/promise';

async function run() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'jale_florist_ta'
  });

  try {
    await db.query("ALTER TABLE messages ADD COLUMN is_deleted_by_admin BOOLEAN DEFAULT FALSE");
    console.log("Added is_deleted_by_admin");
  } catch (e) { console.log(e.message); }

  try {
    await db.query("ALTER TABLE messages ADD COLUMN is_deleted_for_everyone BOOLEAN DEFAULT FALSE");
    console.log("Added is_deleted_for_everyone");
  } catch (e) { console.log(e.message); }

  try {
    await db.query("ALTER TABLE messages ADD COLUMN reply_to_id INT DEFAULT NULL");
    console.log("Added reply_to_id");
  } catch (e) { console.log(e.message); }
  
  process.exit(0);
}
run();
