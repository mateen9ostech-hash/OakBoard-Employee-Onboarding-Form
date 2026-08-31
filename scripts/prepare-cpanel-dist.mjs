import { cpSync, copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const source = join(root, 'api')
const destination = join(root, 'dist', 'api')
const runtimeFiles = ['.htaccess', 'admin.php', 'auth.php', 'bootstrap.php', 'holiday-calendar.json', 'index.php', 'mailgun.php', 'profile.php']

if (!existsSync(join(root, 'dist', 'index.html'))) {
  throw new Error('Vite build output is missing. Run this script after vite build.')
}

rmSync(destination, { recursive: true, force: true })
mkdirSync(destination, { recursive: true })
for (const file of runtimeFiles) {
  copyFileSync(join(source, file), join(destination, file))
}
cpSync(join(source, 'profile'), join(destination, 'profile'), { recursive: true })
copyFileSync(join(root, 'src', 'assets', 'oakboard-logo.svg'), join(root, 'dist', 'oakboard-logo.svg'))

console.log(`Prepared dist/ with ${runtimeFiles.length} OST Workforce Onboarding PHP API runtime files.`)
