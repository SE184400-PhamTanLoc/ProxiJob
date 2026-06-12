const { Client } = require('pg');

const connectionString = 'postgres://postgres.jjruquhoqcwcmogpfvhf:ProxiJob%4012346@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function main() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Database.');

    console.log('Active database sessions:');
    const sessionsRes = await client.query(`
      SELECT pid, usename, client_addr, application_name, state, query 
      FROM pg_stat_activity;
    `);
    console.log(JSON.stringify(sessionsRes.rows, null, 2));

  } catch (err) {
    console.error('Database query error:', err);
  } finally {
    await client.end();
  }
}

main();
