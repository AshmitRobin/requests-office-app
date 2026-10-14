require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');

async function main() {
  const passwordHash = await bcrypt.hash('Demo@12345', 10);
  const users = [
    ['Office Coordinator','coordinator@demo.org','coordinator',null,'Administration'],
    ['External Specialist','specialist@demo.org','specialist',null,'Expert Review'],
    ['Ashmit Robin','requester.main@demo.org','requester','main','Computer Science'],
    ['Harshit Mishra','requester.north@demo.org','requester','north','Commerce']
  ];
  for (const [name,email,role,campus,department] of users) {
    await pool.execute(
      `INSERT INTO users (name,email,password_hash,role,campus,department) VALUES (?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE name=VALUES(name),password_hash=VALUES(password_hash),role=VALUES(role),campus=VALUES(campus),department=VALUES(department)`,
      [name,email,passwordHash,role,campus,department]);
  }
  const [requesterRows] = await pool.execute("SELECT id FROM users WHERE email='requester.main@demo.org'");
  const [countRows] = await pool.execute('SELECT COUNT(*) AS count FROM requests');
  if (countRows[0].count === 0) {
    const samples = [
      [requesterRows[0].id,'main','Computer Science','Laptop purchase quotation','Equipment','Department lab equipment',24500,'Need approval for a lab laptop. Quotations are ready.','submitted'],
      [requesterRows[0].id,'main','Computer Science','Software renewal','Software','Annual software renewal',12000,'Requesting review of the annual software renewal.','with_specialist'],
    ];
    const [northRows] = await pool.execute("SELECT id FROM users WHERE email='requester.north@demo.org'");
    samples.push([northRows[0].id,'north','Commerce','Workshop travel reimbursement','Travel','Workshop travel costs',3500,'Requesting reimbursement for travel to an academic workshop.','needs_correction']);
    for (const s of samples) await pool.execute(
      'INSERT INTO requests (requester_id,campus,department,title,category,people_involved,amount,description,status) VALUES (?,?,?,?,?,?,?,?,?)', s);
  }
  console.log('Demo users ready. Password for all: Demo@12345');
  await pool.end();
}
main().catch(async e => { console.error(e); await pool.end(); process.exit(1); });
