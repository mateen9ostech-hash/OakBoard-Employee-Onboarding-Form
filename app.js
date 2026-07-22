'use strict'

/* eslint-disable @typescript-eslint/no-require-imports */

// cPanel Application Manager / Phusion Passenger starts `app.js` by default.
// `npm run build` creates the production server required below.
process.env.NODE_ENV = 'production'
process.env.HOSTNAME = process.env.OAKBOARD_HOSTNAME || '0.0.0.0'

try {
  require('./.next/standalone/server.js')
} catch (error) {
  console.error('OakBoard production build is missing or could not start. Run `npm ci` and `npm run build` first.')
  throw error
}
