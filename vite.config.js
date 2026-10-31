import { createClient } from '@sanity/client'
import { syncStudentDocument, verifyFirebaseIdToken } from './server/studentProfileSync.js'
import { createSanityUserActivity, USER_ACTIVITY_COIN_VALUES } from './server/userActivitySync.js'
import {
  createRazorpayOrder,
  PaymentRequestError,
  verifyRazorpayPayment
} from './server/razorpayPayments.js'
import { getVideoCourseClassAccess } from './api/video-course-class-access.js'
import { defineConfig, loadEnv } from 'vite'
import { getSanityWriteToken } from './server/environment.js'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const localBookRequestApi = (env) => {
  const writeToken = getSanityWriteToken(env)
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
          response.end(JSON.stringify({ success: false, error: 'SANITY_API_WRITE_TOKEN or SANITY_WRITE_TOKEN is not configured for local development.' }))
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

          console.error('Failed to create a local book request in Sanity.')
          response.statusCode = 500
          response.end(JSON.stringify({ success: false, error: 'Unable to submit the book request.' }))
        }
      })
    }
  }
}

const localStudentProfileApi = (env) => {
  const writeToken = getSanityWriteToken(env)
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
            missingConfiguration: ['SANITY_API_WRITE_TOKEN or SANITY_WRITE_TOKEN']
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

          console.error('Failed to sync a local student profile to Sanity.')
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
  const writeToken = getSanityWriteToken(env)
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
          const productType = getString(body.productType) || 'book'
          const courseId = getString(body.courseId)
          const courseTitle = getString(body.courseTitle)
          const phone = getString(body.phone)
          const reason = getString(body.reason)
          const amount = Number(body.amount)
          const firebaseApiKey = getString(body.firebaseApiKey)
            || env.VITE_FIREBASE_API_KEY
            || env.FIREBASE_WEB_API_KEY
          if (!uid || !Object.hasOwn(USER_ACTIVITY_COIN_VALUES, action) || bookId.length > 200
            || bookTitle.length > 300 || courseId.length > 200 || courseTitle.length > 300
            || phone.length > 32 || !['book', 'videoCoursePack'].includes(productType)
            || (['checkout_initiated', 'payment_dropped', 'payment_failed', 'payment_abandoned'].includes(action)
              && (!(productType === 'videoCoursePack' ? courseId && courseTitle : bookId && bookTitle)
                || !reason || reason.length > 500
                || !Number.isFinite(amount) || amount < 0))) {
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
            productType,
            courseId,
            courseTitle,
            phone,
            reason,
            amount
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
          if (error.code === 'COURSE_NOT_ENROLLABLE') {
            response.statusCode = 409
            response.end(JSON.stringify({ success: false, error: error.message }))
            return
          }
          console.error('Failed to sync local student activity to Sanity.')
          response.statusCode = 500
          response.end(JSON.stringify({ success: false, error: 'Unable to sync student activity to Sanity.' }))
        }
      })
    }
  }
}

const localRazorpayApi = (env) => ({
  name: 'local-razorpay-api',
  apply: 'serve',
  configureServer(server) {
    const endpoints = {
      '/api/create-razorpay-order': createRazorpayOrder,
      '/api/verify-razorpay-payment': verifyRazorpayPayment,
      '/api/video-course-class-access': getVideoCourseClassAccess
    }

    Object.entries(endpoints).forEach(([path, endpoint]) => {
      server.middlewares.use(path, async (request, response) => {
        response.setHeader('Content-Type', 'application/json')
        if (request.method !== 'POST') {
          response.setHeader('Allow', 'POST')
          response.statusCode = 405
          response.end(JSON.stringify({ success: false, error: 'Method not allowed.' }))
          return
        }

        let body
        try {
          let rawBody = ''
          for await (const chunk of request) rawBody += chunk
          body = JSON.parse(rawBody)
        } catch (error) {
          if (error instanceof SyntaxError) {
            response.statusCode = 400
            response.end(JSON.stringify({ success: false, error: 'Request body must be valid JSON.' }))
            return
          }
          console.error('Failed to read a local Razorpay request.')
          response.statusCode = 400
          response.end(JSON.stringify({ success: false, error: 'Unable to read the request body.' }))
          return
        }

        try {
          const result = await endpoint({
            body,
            authorization: request.headers.authorization,
            env
          })
          response.statusCode = 200
          response.end(JSON.stringify({ success: true, ...result }))
        } catch (error) {
          if (error instanceof PaymentRequestError) {
            response.statusCode = error.status
            response.end(JSON.stringify({ success: false, error: error.message }))
            return
          }
          if (Number.isInteger(error.status)) {
            response.statusCode = error.status
            response.end(JSON.stringify({ success: false, error: error.message }))
            return
          }
          console.error(
            'Failed to handle a local Razorpay request:',
            error instanceof Error ? error.message : 'Unknown server error.'
          )
          response.statusCode = 500
          response.end(JSON.stringify({ success: false, error: 'Unable to process the Razorpay request.' }))
        }
      })
    })
  }
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    define: {
      'process.env': {}
    },
    server: {
      proxy: {
        '/api/gemini': {
          target: 'https://generativelanguage.googleapis.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/gemini/, '/v1beta/models/gemini-1.5-flash:generateContent')
        }
      }
    },
    plugins: [
      localBookRequestApi(env),
      localStudentProfileApi(env),
      localUserActivityApi(env),
      localRazorpayApi(env),
      react(),
      tailwindcss(),
    ],
  }
})