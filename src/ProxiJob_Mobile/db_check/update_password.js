const { Client } = require('pg');
const bcrypt = require('bcryptjs'); // Or we can hash using a standard library or just run a query if we can do it in node

const connectionString = 'postgres://postgres.jjruquhoqcwcmogpfvhf:ProxiJob%4012346@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres';

async function main() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Database.');

    // 1. Get columns of identity_users
    const colsRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'identity_users';
    `);
    console.log('Columns of identity_users:', colsRes.rows.map(r => `${r.column_name} (${r.data_type})`));

    // 2. Generate bcrypt hash for "12345678"
    // BCrypt.Net default work factor is 11, but in node 10 is fast enough
    const salt = bcrypt.genSaltSync(11);
    const hash = bcrypt.hashSync('12345678', salt);
    console.log('Generated hash for "12345678":', hash);

    // Let's identify the column for password hash. EF Core default for User.PasswordHash is usually 'passwordhash' in snakecase
    const hasCol = colsRes.rows.some(r => r.column_name === 'passwordhash');
    const passCol = hasCol ? 'passwordhash' : 'password';

    // 3. Update password hash for business@proxijob.test and student@proxijob.test
    const updateRes = await client.query(`
      UPDATE public.identity_users 
      SET ${passCol} = $1 
      WHERE email IN ('business@proxijob.test', 'student@proxijob.test')
      RETURNING id, email, fullname;
    `, [hash]);

    console.log('Updated users:', updateRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
