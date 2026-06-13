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

    const resEmp = await client.query(`
      SELECT id, business_id, user_id, full_name, is_external, payment_type, status, created_at, position, is_deleted
      FROM public.management_employees;
    `);

    console.log('Employees:');
    console.log(JSON.stringify(resEmp.rows, null, 2));

    const resSched = await client.query(`
      SELECT id, employee_id, job_shift_id, job_shift_salary, date, start_time, end_time, created_at, is_deleted
      FROM public.management_work_schedules;
    `);

    console.log('Schedules:');
    console.log(JSON.stringify(resSched.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
