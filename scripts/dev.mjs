import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const projectRoot = process.cwd()
const localConfig = join(homedir(), 'Downloads', 'oakboard-config.php')
const environment = { ...process.env }

if (!environment.OAKBOARD_CONFIG_FILE && existsSync(localConfig)) {
  environment.OAKBOARD_CONFIG_FILE = localConfig
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const processes = [
  spawn('php', ['-S', '127.0.0.1:8080', '-t', 'api', 'api/router.php'], {
    cwd: projectRoot,
    env: environment,
    stdio: 'inherit',
  }),
  spawn(npmCommand, ['run', 'dev:web'], {
    cwd: projectRoot,
    env: environment,
    stdio: 'inherit',
  }),
]

let stopping = false

function stop(exitCode = 0) {
  if (stopping) return
  stopping = true
  for (const child of processes) {
    if (!child.killed) child.kill()
  }
  process.exit(exitCode)
}

for (const child of processes) {
  child.on('error', (error) => {
    console.error(error.message)
    stop(1)
  })
  child.on('exit', (code) => {
    if (!stopping) stop(code ?? 0)
  })
}

process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))
