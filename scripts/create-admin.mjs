import { neon } from '@neondatabase/serverless'
import { hashPassword } from '@better-auth/utils/password'
import { randomUUID } from 'node:crypto'

const ADMIN_EMAIL = 'admin@rexta.com'
const ADMIN_PASSWORD = 'Admin123!'
const ADMIN_NAME = 'Admin'

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL tidak di-set.')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

// Hapus admin lama jika ada (bersihkan hash bcrypt yang salah)
const existing = await sql`SELECT id FROM "user" WHERE email = ${ADMIN_EMAIL}`
if (existing.length > 0) {
  const oldUserId = existing[0].id
  await sql`DELETE FROM account WHERE "userId" = ${oldUserId}`
  await sql`DELETE FROM "user" WHERE id = ${oldUserId}`
  console.log('Admin lama dihapus:', ADMIN_EMAIL)
}

const userId = randomUUID()
const accountId = randomUUID()
const now = new Date()

// Gunakan hashPassword dari better-auth (scrypt format: salt:hex)
const hashedPassword = await hashPassword(ADMIN_PASSWORD)

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
console.log('  Hash    :', hashedPassword.substring(0, 30) + '...')
