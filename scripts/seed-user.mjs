import { neon } from '@neondatabase/serverless'
import { hashPassword } from '@better-auth/utils/password'
import { randomUUID } from 'node:crypto'

const EMAIL = 'admin@redone.com'
const PASSWORD = 'admin123'
const NAME = 'Admin Redone'

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL tidak di-set.')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

// Hapus user lama jika ada
const existing = await sql`SELECT id FROM "user" WHERE email = ${EMAIL}`
if (existing.length > 0) {
  const oldId = existing[0].id
  await sql`DELETE FROM account WHERE "userId" = ${oldId}`
  await sql`DELETE FROM "user" WHERE id = ${oldId}`
  console.log('User lama dihapus:', EMAIL)
}

const userId = randomUUID()
const now = new Date()
const hashedPassword = await hashPassword(PASSWORD)

await sql`
  INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
  VALUES (${userId}, ${NAME}, ${EMAIL}, false, ${now}, ${now})
`

await sql`
  INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
  VALUES (${randomUUID()}, ${userId}, 'credential', ${userId}, ${hashedPassword}, ${now}, ${now})
`

console.log('User berhasil dibuat!')
console.log('  Email   :', EMAIL)
console.log('  Password:', PASSWORD)
