import { randomUUID } from 'node:crypto'
import { createClient } from '@sanity/client'
import { appendStudentPurchase, syncStudentDocument, verifyFirebaseIdToken } from './server/studentProfileSync.js'
import { createSanityUserActivity, USER_ACTIVITY_COIN_VALUES } from './server/userActivitySync.js'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const localBookRequestApi = (env) => {
  const writeToken = env.SANITY_API_WRITE_TOKEN
    || env.VITE_SANITY_WRITE_TOKEN
    || env.VITE_SANITY_API_WRITE_TOKEN
  const client = writeToken
    ? createClient({
      projectId: env.SANITY_PROJECT_ID || env.VITE_SANITY_PROJECT_ID || 'rkev3aui',
      dataset: env.SANITY_DATASET || env.VITE_SANITY_DATASET || 'production',
      apiVersion: '2024-01-01',
      token: writeToken,
      useCdn: false
    })
    : null

  return {
    name: 'local-book-request-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/request-book', async (request, response) => {
        response.setHeader('Content-Type', 'application/json')

        if (request.method !== 'POST') {
          response.setHeader('Allow', 'POST')
          response.statusCode = 405
          response.end(JSON.stringify({ success: false, error: 'Method not allowed.' }))
          return
        }

        if (!client) {
          response.statusCode = 503
          response.end(JSON.stringify({ success: false, error: 'SANITY_API_WRITE_TOKEN is not configured for local development.' }))
          return
        }

        try {
          let rawBody = ''
          for await (const chunk of request) {
            rawBody += chunk
          }

          const body = JSON.parse(rawBody)
          if (!body || typeof body !== 'object' || Array.isArray(body)) {
            response.statusCode = 400
            response.end(JSON.stringify({ success: false, error: 'A valid request body is required.' }))
            return
          }

          const requestedBookTitle = typeof body.requestedBookTitle === 'string'
            ? body.requestedBookTitle.trim()
            : ''
          if (!requestedBookTitle) {
            response.statusCode = 400
            response.end(JSON.stringify({ success: false, error: 'Requested book title is required.' }))
            return
          }

          const getString = (value) => (typeof value === 'string' ? value.trim() : '')
          await client.create({
            _type: 'bookRequest',
            studentName: getString(body.studentName),
            contactNumber: getString(body.contactNumber),
            email: getString(body.email),
            requestedBookTitle,
            examCategory: getString(body.examCategory) || 'Other',
            additionalDetails: getString(body.additionalDetails),
            status: 'Pending',
            requestedAt: new Date().toISOString()
          })

          response.statusCode = 200
          response.end(JSON.stringify({ success: true }))
        } catch (error) {
          if (error instanceof SyntaxError) {
            response.statusCode = 400
            response.end(JSON.stringify({ success: false, error: 'Request body must be valid JSON.' }))
            return
          }

          console.error('Failed to create a local book request in Sanity:', error)
          response.statusCode = 500
          response.end(JSON.stringify({ success: false, error: 'Unable to submit the book request.' }))
        }
      })
    }
  }
}

const localStudentProfileApi = (env) => {
  const writeToken = env.SANITY_API_WRITE_TOKEN
    || env.VITE_SANITY_WRITE_TOKEN
    || env.VITE_SANITY_API_WRITE_TOKEN
  const client = writeToken
    ? createClient({
      projectId: env.SANITY_PROJECT_ID || env.VITE_SANITY_PROJECT_ID || 'rkev3aui',
      dataset: env.SANITY_DATASET || env.VITE_SANITY_DATASET || 'production',
      apiVersion: '2023-01-01',
      token: writeToken,
      useCdn: false
    })
    : null

  return {
    name: 'local-student-profile-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/sync-student', async (request, response) => {
        response.setHeader('Content-Type', 'application/json')

        if (request.method !== 'POST') {
          response.setHeader('Allow', 'POST')
          response.statusCode = 405
          response.end(JSON.stringify({ success: false, error: 'Method not allowed.' }))
          return
        }

        if (!client) {
          response.statusCode = 503
          response.end(JSON.stringify({
            success: false,
            error: 'Student profile sync is missing a server-side Sanity write token.',
            missingConfiguration: ['SANITY_API_WRITE_TOKEN or a VITE_SANITY_* compatibility variable']
          }))
          return
        }

        const idToken = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
        if (!idToken) {
          response.statusCode = 401
          response.end(JSON.stringify({ success: false, error: 'Authentication is required.' }))
          return
        }

        try {
          let rawBody = ''
          for await (const chunk of request) {
            rawBody += chunk
          }

          const body = JSON.parse(rawBody)
          if (!body || typeof body !== 'object' || Array.isArray(body)) {
            response.statusCode = 400
            response.end(JSON.stringify({ success: false, error: 'A valid request body is required.' }))
            return
          }

          const requestedUid = typeof body.uid === 'string' ? body.uid.trim() : ''
          const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
          const profile = {
            fullName: typeof body.name === 'string' ? body.name.trim() : '',
            email: typeof body.email === 'string' ? body.email.trim() : ''
          }
          const firebaseApiKey = typeof body.firebaseApiKey === 'string'
            ? body.firebaseApiKey.trim()
            : env.VITE_FIREBASE_API_KEY || env.FIREBASE_WEB_API_KEY
          if (!requestedUid || !firebaseApiKey || phone.length > 32 || profile.fullName.length > 200 || profile.email.length > 320) {
            response.statusCode = 400
            response.end(JSON.stringify({ success: false, error: 'Student profile fields are invalid.' }))
            return
          }

          const firebaseUser = await verifyFirebaseIdToken(idToken, firebaseApiKey)
          if (requestedUid !== firebaseUser.localId) {
            response.statusCode = 403
            response.end(JSON.stringify({ success: false, error: 'The requested user does not match the authenticated account.' }))
            return
          }

          const document = await syncStudentDocument(client, firebaseUser, phone, profile)
          const result = { success: true, documentId: document._id }
          console.log('Student profile synced to Sanity:', result)
          response.statusCode = 200
          response.end(JSON.stringify(result))
        } catch (error) {
          if (error instanceof SyntaxError) {
            response.statusCode = 400
            response.end(JSON.stringify({ success: false, error: 'Request body must be valid JSON.' }))
            return
          }
          if (error.code === 'INVALID_FIREBASE_TOKEN') {
            response.statusCode = 401
            response.end(JSON.stringify({ success: false, error: 'Authentication is invalid or expired.' }))
            return
          }

          console.error('Failed to sync a local student profile to Sanity:', error)
          response.statusCode = 500
          response.end(JSON.stringify({
            success: false,
            error: 'Unable to sync the student profile.',
            details: error.message
          }))
        }
      })
    }
  }
}

const localUserActivityApi = (env) => {
  const writeToken = env.SANITY_API_WRITE_TOKEN
    || env.VITE_SANITY_WRITE_TOKEN
    || env.VITE_SANITY_API_WRITE_TOKEN
  const client = writeToken
    ? createClient({
      projectId: env.SANITY_PROJECT_ID || env.VITE_SANITY_PROJECT_ID || 'rkev3aui',
      dataset: env.SANITY_DATASET || env.VITE_SANITY_DATASET || 'production',
      apiVersion: '2024-01-01',
      token: writeToken,
      useCdn: false
    })
    : null

  return {
    name: 'local-user-activity-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/log-user-activity', async (request, response) => {
        response.setHeader('Content-Type', 'application/json')
        if (request.method !== 'POST') {
          response.setHeader('Allow', 'POST')
          response.statusCode = 405
          response.end(JSON.stringify({ success: false, error: 'Method not allowed.' }))
          return
        }
        if (!client) {
          response.statusCode = 503
          response.end(JSON.stringify({ success: false, error: 'Activity logging is missing a server-side Sanity write token.' }))
          return
        }

        const idToken = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
        if (!idToken) {
          response.statusCode = 401
          response.end(JSON.stringify({ success: false, error: 'Authentication is required.' }))
          return
        }

        try {
          let rawBody = ''
          for await (const chunk of request) rawBody += chunk
          const body = JSON.parse(rawBody)
          if (!body || typeof body !== 'object' || Array.isArray(body)) {
            response.statusCode = 400
            response.end(JSON.stringify({ success: false, error: 'A valid request body is required.' }))
            return
          }

          const getString = (value) => (typeof value === 'string' ? value.trim() : '')
          const uid = getString(body.uid)
          const action = getString(body.action)
          const bookId = getString(body.bookId)
          const bookTitle = getString(body.bookTitle)
          const phone = getString(body.phone)
          const firebaseApiKey = getString(body.firebaseApiKey)
            || env.VITE_FIREBASE_API_KEY
            || env.FIREBASE_WEB_API_KEY
          const totalCoins = Number(body.totalCoins)
          if (!uid || !USER_ACTIVITY_COIN_VALUES[action] || bookId.length > 200
            || bookTitle.length > 300 || phone.length > 32
            || !Number.isSafeInteger(totalCoins) || totalCoins < 0) {
            response.statusCode = 400
            response.end(JSON.stringify({ success: false, error: 'Activity details are invalid.' }))
            return
          }
          if (action === 'purchase_complete') {
            response.statusCode = 403
            response.end(JSON.stringify({
              success: false,
              error: 'Purchase completion must be recorded by a verified payment-provider webhook.'
            }))
            return
          }
          if (!firebaseApiKey) {
            response.statusCode = 503
            response.end(JSON.stringify({ success: false, error: 'The Firebase public API key is not configured.' }))
            return
          }

          const firebaseUser = await verifyFirebaseIdToken(idToken, firebaseApiKey)
          if (uid !== firebaseUser.localId) {
            response.statusCode = 403
            response.end(JSON.stringify({ success: false, error: 'The requested user does not match the authenticated account.' }))
            return
          }

          const result = await createSanityUserActivity(client, firebaseUser, {
            action,
            bookId,
            bookTitle,
            phone
          })
          response.statusCode = 200
          response.end(JSON.stringify({ success: true, ...result }))
        } catch (error) {
          if (error instanceof SyntaxError) {
            response.statusCode = 400
            response.end(JSON.stringify({ success: false, error: 'Request body must be valid JSON.' }))
            return
          }
          if (error.code === 'INVALID_FIREBASE_TOKEN') {
            response.statusCode = 401
            response.end(JSON.stringify({ success: false, error: 'Authentication is invalid or expired.' }))
            return
          }
          console.error('Failed to sync local student activity to Sanity:', error)
          response.statusCode = 500
          response.end(JSON.stringify({ success: false, error: 'Unable to sync student activity to Sanity.' }))
        }
      })
    }
  }
}

const _localStudentPurchaseApi = (env) => {
  const writeToken = env.SANITY_API_WRITE_TOKEN
    || env.VITE_SANITY_WRITE_TOKEN
    || env.VITE_SANITY_API_WRITE_TOKEN
  const client = writeToken
    ? createClient({
      projectId: env.SANITY_PROJECT_ID || env.VITE_SANITY_PROJECT_ID || 'rkev3aui',
      dataset: env.SANITY_DATASET || env.VITE_SANITY_DATASET || 'production',
      apiVersion: '2023-01-01',
      token: writeToken,
      useCdn: false
    })
    : null

  return {
    name: 'local-student-purchase-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/track-purchase', async (request, response) => {
        response.setHeader('Content-Type', 'application/json')

        if (request.method !== 'POST') {
          response.setHeader('Allow', 'POST')
          response.statusCode = 405
          response.end(JSON.stringify({ success: false, error: 'Method not allowed.' }))
          return
        }

        if (!client) {
          response.statusCode = 503
          response.end(JSON.stringify({
            success: false,
            error: 'Purchase tracking is missing a server-side Sanity write token.'
          }))
          return
        }

        const idToken = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
        if (!idToken) {
          response.statusCode = 401
          response.end(JSON.stringify({ success: false, error: 'Authentication is required.' }))
          return
        }

        try {
          let rawBody = ''
          for await (const chunk of request) {
            rawBody += chunk
          }

          const body = JSON.parse(rawBody)
          if (!body || typeof body !== 'object' || Array.isArray(body)) {
            response.statusCode = 400
            response.end(JSON.stringify({ success: false, error: 'A valid request body is required.' }))
            return
          }

          const uid = typeof body.uid === 'string' ? body.uid.trim() : ''
          const bookId = typeof body.bookId === 'string' ? body.bookId.trim() : ''
          const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
          const firebaseApiKey = typeof body.firebaseApiKey === 'string'
            ? body.firebaseApiKey.trim()
            : env.VITE_FIREBASE_API_KEY || env.FIREBASE_WEB_API_KEY
          if (!uid || !bookId || bookId.length > 200 || phone.length > 32) {
            response.statusCode = 400
            response.end(JSON.stringify({ success: false, error: 'Purchase details are invalid.' }))
            return
          }
          if (!firebaseApiKey) {
            response.statusCode = 503
            response.end(JSON.stringify({
              success: false,
              error: 'Purchase tracking is missing the Firebase public API key required to verify the signed-in user.'
            }))
            return
          }

          const firebaseUser = await verifyFirebaseIdToken(idToken, firebaseApiKey)
          if (uid !== firebaseUser.localId) {
            response.statusCode = 403
            response.end(JSON.stringify({ success: false, error: 'The requested user does not match the authenticated account.' }))
            return
          }

          const orderId = `checkout_${randomUUID()}`
          const result = await appendStudentPurchase(client, firebaseUser, {
            bookId,
            phone,
            orderId
          })
          console.log('Student purchase event synced to Sanity:', result)
          response.statusCode = 200
          response.end(JSON.stringify({ success: true, ...result }))
        } catch (error) {
          if (error instanceof SyntaxError) {
            response.statusCode = 400
            response.end(JSON.stringify({ success: false, error: 'Request body must be valid JSON.' }))
            return
          }
          if (error.code === 'INVALID_FIREBASE_TOKEN') {
            response.statusCode = 401
            response.end(JSON.stringify({ success: false, error: 'Authentication is invalid or expired.' }))
            return
          }
          if (error.code === 'BOOK_NOT_FOUND') {
            response.statusCode = 404
            response.end(JSON.stringify({ success: false, error: error.message }))
            return
          }
          if (error.code === 'BOOK_NOT_PURCHASABLE') {
            response.statusCode = 400
            response.end(JSON.stringify({ success: false, error: error.message }))
            return
          }

          console.error('Failed to sync a local student purchase event to Sanity:', error)
          response.statusCode = 500
          response.end(JSON.stringify({ success: false, error: 'Unable to sync the purchase event.' }))
        }
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    define: {
      'process.env': {}
    },
    plugins: [
      localBookRequestApi(env),
      localStudentProfileApi(env),
      localUserActivityApi(env),
      react(),
      tailwindcss(),
    ],
  }
})