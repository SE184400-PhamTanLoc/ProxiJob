const { Client } = require('pg');

const connectionString = 'postgres://postgres.jjruquhoqcwcmogpfvhf:ProxiJob%4012346@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres';

async function main() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Database.');

    const res = await client.query(`
      SELECT 
        a.id as app_id, 
        a.jobshiftid, 
        a.studentid, 
        a.status as app_status,
        s.jobpostid,
        p.businessid as post_businessid,
        p.title as job_title,
        p.createdby as post_createdby
      FROM public.job_applications a
      JOIN public.job_jobshifts s ON a.jobshiftid = s.id
      JOIN public.job_jobposts p ON s.jobpostid = p.id;
    `);

    console.log('Applications with details:');
    console.log(JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
