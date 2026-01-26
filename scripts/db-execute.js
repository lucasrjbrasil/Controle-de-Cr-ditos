import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load .env from project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Client } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('Error: DATABASE_URL not found in .env');
    console.error('Available keys:', Object.keys(process.env).filter(k => !k.startsWith('npm_') && !k.startsWith('Program')));
    process.exit(1);
}

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();

        const args = process.argv.slice(2);

        if (args.length > 0) {
            const filePath = args[0];
            const absolutePath = path.resolve(filePath);
            console.log(`Executing SQL from: ${path.basename(absolutePath)}`);

            if (!fs.existsSync(absolutePath)) {
                throw new Error(`File not found: ${absolutePath}`);
            }

            const sql = fs.readFileSync(absolutePath, 'utf-8');
            await client.query(sql);
            console.log('✅ SQL executed successfully!');
        } else {
            const res = await client.query('SELECT NOW() as now, current_database() as db');
            console.log('✅ Connection Successful!');
            console.log(`   Database: ${res.rows[0].db}`);
            console.log(`   Server Time: ${res.rows[0].now}`);
        }

    } catch (err) {
        console.error('❌ Database Operation Failed:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
