import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const projectRoot = process.cwd()
const nextRoot = join(projectRoot, '.next')
const standaloneRoot = join(nextRoot, 'standalone')
const standaloneServer = join(standaloneRoot, 'server.js')

if (!existsSync(standaloneServer)) {
  throw new Error('Next.js standalone server was not generated. Keep `output: standalone` enabled in next.config.ts.')
}

function replaceDirectory(source, destination) {
  if (!existsSync(source)) return
  rmSync(destination, { recursive: true, force: true })
  mkdirSync(destination, { recursive: true })
  cpSync(source, destination, { recursive: true })
}

replaceDirectory(join(projectRoot, 'public'), join(standaloneRoot, 'public'))
replaceDirectory(join(nextRoot, 'static'), join(standaloneRoot, '.next', 'static'))

console.log('Prepared .next/standalone for cPanel Passenger.')
