import mysql from 'mysql2/promise';

export const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Sesuaikan jika ada password
    database: 'jale_florist_ta'
});

console.log('✅ Backend berhasil terhubung ke MySQL!');
