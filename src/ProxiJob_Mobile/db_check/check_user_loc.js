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

    const userRes = await client.query(`
      SELECT id, email, fullname
      FROM public.identity_users
      WHERE email = 'locptse184400@fpt.edu.vn';
    `);
    console.log('User Details:');
    console.log(userRes.rows);

    if (userRes.rows.length > 0) {
      const userId = userRes.rows[0].id;

      const empRes = await client.query(`
        SELECT id, business_id, user_id, full_name, is_external, status
        FROM public.management_employees
        WHERE user_id = $1;
      `, [userId]);
      console.log('Employee Records for User ID:', userId);
      console.log(empRes.rows);

      const appRes = await client.query(`
        SELECT a.id, a.jobshiftid, a.studentid, a.status, s.jobpostid, p.businessid
        FROM public.job_applications a
        JOIN public.job_jobshifts s ON a.jobshiftid = s.id
        JOIN public.job_jobposts p ON s.jobpostid = p.id
        WHERE a.studentid = $1;
      `, [userId]);
      console.log('Applications for User ID:', userId);
      console.log(appRes.rows);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
