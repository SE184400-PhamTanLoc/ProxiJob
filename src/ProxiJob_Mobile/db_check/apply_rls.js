const { Client } = require('pg');

const connectionString = 'postgres://postgres.jjruquhoqcwcmogpfvhf:ProxiJob%4012346@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres';

async function main() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase PostgreSQL database...');
    await client.connect();
    console.log('Connected successfully!');

    console.log('Applying RLS policies for "avatars" bucket...');

    // 1. Ensure bucket is public
    await client.query(`
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('avatars', 'avatars', true)
      ON CONFLICT (id) DO UPDATE SET public = true;
    `);
    console.log('- Bucket "avatars" is public.');

    // 2. Drop existing conflicting policies
    await client.query(`
      DROP POLICY IF EXISTS "Allow Public Upload" ON storage.objects;
      DROP POLICY IF EXISTS "Allow Public Update" ON storage.objects;
      DROP POLICY IF EXISTS "Allow Public Delete" ON storage.objects;
      DROP POLICY IF EXISTS "Allow Public Select" ON storage.objects;
    `);

    // 3. Create policies for anonymous uploads/access
    await client.query(`
      CREATE POLICY "Allow Public Upload" ON storage.objects
      FOR INSERT TO anon
      WITH CHECK (bucket_id = 'avatars');
    `);
    console.log('- Created INSERT policy.');

    await client.query(`
      CREATE POLICY "Allow Public Update" ON storage.objects
      FOR UPDATE TO anon
      USING (bucket_id = 'avatars');
    `);
    console.log('- Created UPDATE policy.');

    await client.query(`
      CREATE POLICY "Allow Public Delete" ON storage.objects
      FOR DELETE TO anon
      USING (bucket_id = 'avatars');
    `);
    console.log('- Created DELETE policy.');

    await client.query(`
      CREATE POLICY "Allow Public Select" ON storage.objects
      FOR SELECT TO anon
      USING (bucket_id = 'avatars');
    `);
    console.log('- Created SELECT policy.');

    console.log('RLS policies successfully applied to Supabase database!');
  } catch (err) {
    console.error('Error applying RLS policies:', err);
  } finally {
    await client.end();
  }
}

main();
