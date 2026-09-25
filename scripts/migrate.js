import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const {
  DATABASE_URL,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

const migrationFilePath = path.resolve(__dirname, '../supabase/migrations/001_initial_schema.sql');

async function runMigration() {
  console.log('====================================================');
  console.log('  Supabase Cloud PostgreSQL Migration Runner');
  console.log('====================================================\n');

  if (!fs.existsSync(migrationFilePath)) {
    console.error(`❌ Migration file not found at: ${migrationFilePath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(migrationFilePath, 'utf-8');
  console.log(`📄 Loaded migration script (001_initial_schema.sql) [${sqlContent.length} bytes]`);

  // Method 1: Direct PostgreSQL Connection via DATABASE_URL
  if (DATABASE_URL && !DATABASE_URL.includes('your-db-password')) {
    console.log('🔌 Connecting directly via DATABASE_URL...');
    const client = new pg.Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();
      console.log('✅ Connected to PostgreSQL database successfully.');
      console.log('🚀 Executing initial schema and RLS policies...');
      await client.query(sqlContent);
      console.log('🎉 Migration applied successfully via PostgreSQL direct connection!');
      await client.end();
      process.exit(0);
    } catch (err) {
      console.error('❌ Failed to execute migration via PostgreSQL client:', err.message);
      await client.end();
      process.exit(1);
    }
  }

  // Method 2: Supabase Client Check & Guidelines
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_URL.includes('mock-supabase')) {
    console.log(`🌐 Supabase URL detected: ${SUPABASE_URL}`);
    console.log('🔑 Supabase Service Role Key detected.');

    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      // Test basic connectivity to Supabase
      const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
      
      if (!error) {
        console.log('✅ Tables already detected and accessible in Supabase Cloud!');
      } else {
        console.log(`ℹ️ Supabase API status: ${error.message}`);
        console.log('\n💡 Note: Supabase REST API does not allow arbitrary DDL execution without pg connection.');
        console.log('   To apply DDL automatically:');
        console.log('   1. Provide DATABASE_URL in .env (Find it in Supabase Dashboard -> Settings -> Database -> Connection string URI)');
        console.log('   2. OR paste the content of supabase/migrations/001_initial_schema.sql into Supabase SQL Editor.');
      }
    } catch (err) {
      console.error('⚠️ Supabase connection check warning:', err.message);
    }
  } else {
    console.log('ℹ️ Running in Local / Demo configuration.');
    console.log('   To connect to your live Supabase project:');
    console.log('   1. Update SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env');
    console.log('   2. Optional: Add DATABASE_URL in .env to run direct migrations via `npm run migrate`');
  }

  console.log('\n✅ Migration check completed.');
}

runMigration().catch((err) => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
