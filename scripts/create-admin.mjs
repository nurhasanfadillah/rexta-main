import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'

const ADMIN_EMAIL = 'admin@rexta.com'
const ADMIN_PASSWORD = 'Admin123!'
const ADMIN_NAME = 'Admin'

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL tidak di-set.')
  console.error('Buat file .env lalu isi DATABASE_URL dari Neon console.')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

const existing = await sql`SELECT id FROM "user" WHERE email = ${ADMIN_EMAIL}`
if (existing.length > 0) {
  console.log('Admin sudah ada:', ADMIN_EMAIL)
  process.exit(0)
}

const userId = randomUUID()
const accountId = randomUUID()
const now = new Date()
const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10)

await sql`
  INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
  VALUES (${userId}, ${ADMIN_NAME}, ${ADMIN_EMAIL}, false, ${now}, ${now})
`

await sql`
  INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
  VALUES (${accountId}, ${userId}, 'credential', ${userId}, ${hashedPassword}, ${now}, ${now})
`

console.log('Admin berhasil dibuat!')
console.log('  Email   :', ADMIN_EMAIL)
console.log('  Password:', ADMIN_PASSWORD)
