import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
import { readdir, readFile } from 'fs/promises'
import path from 'path'

const env = process.argv[2] || 'staging'
const envFile = env === 'production' ? '.env.prod' : '.env'

console.log(`Running migrations for ${env} environment...`)
console.log(`Loading config from: ${envFile}`)

config({ path: envFile })

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not found in environment')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

const main = async () => {
  try {
    // ensure __drizzle_migrations table exists
    await sql`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash TEXT NOT NULL,
        created_at BIGINT
      );
    `

    // get already applied migrations
    const appliedMigrations = await sql`
      SELECT hash FROM __drizzle_migrations ORDER BY id;
    `
    const appliedSet = new Set(appliedMigrations.map((m) => m.hash))

    console.log(`Found ${appliedSet.size} previously applied migration(s)`)

    // read migration files
    const migrationsDir = path.join(process.cwd(), 'drizzle')
    const files = await readdir(migrationsDir)
    const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort()

    console.log(`Found ${sqlFiles.length} migration file(s) on disk`)

    let appliedCount = 0

    // apply pending migrations
    for (const file of sqlFiles) {
      const migrationName = file.replace('.sql', '')

      if (appliedSet.has(migrationName)) {
        console.log(`⏭️  Skipping ${migrationName} (already applied)`)
        continue
      }

      console.log(`🔄 Applying ${migrationName}...`)

      const filePath = path.join(migrationsDir, file)
      const migrationSQL = await readFile(filePath, 'utf-8')

      // split by statement breakpoint and execute each statement
      const statements = migrationSQL
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      // Execute SQL and its bookkeeping atomically; unsafe() only builds a fragment.
      await sql.transaction([
        ...statements.map((statement) => sql.query(statement)),
        sql`INSERT INTO __drizzle_migrations (hash, created_at) VALUES (${migrationName}, ${Date.now()})`,
      ])

      console.log(`✅ Applied ${migrationName}`)
      appliedCount++
    }

    if (appliedCount === 0) {
      console.log('\n✨ No new migrations to apply')
    } else {
      console.log(`\n✅ Successfully applied ${appliedCount} migration(s)`)
    }
  } catch (error) {
    console.error('Error during migration:', error)
    process.exit(1)
  }
}

main()
