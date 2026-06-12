const { Client } = require('pg');

const connectionString = 'postgres://postgres.jjruquhoqcwcmogpfvhf:ProxiJob%4012346@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres';

async function main() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Database. Checking storage.objects...');

    const res = await client.query(`
      SELECT id, bucket_id, name, owner, created_at, updated_at, metadata FROM storage.objects;
    `);

    console.log('Uploaded objects in storage.objects:');
    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
