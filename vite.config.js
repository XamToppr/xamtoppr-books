import { createClient } from '@sanity/client'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const localBookRequestApi = (env) => {
  const writeToken = env.SANITY_API_WRITE_TOKEN
  const client = writeToken
    ? createClient({
      projectId: env.SANITY_PROJECT_ID || 'rkev3aui',
      dataset: env.SANITY_DATASET || 'production',
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    define: {
      'process.env': {}
    },
    plugins: [
      localBookRequestApi(env),
      react(),
      tailwindcss(),
    ],
  }
})