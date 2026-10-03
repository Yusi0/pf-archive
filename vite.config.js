import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Vite Custom Dev Server API Plugin for content/ Markdown File Management
function pfArchiveApiPlugin() {
  const contentDir = path.resolve(__dirname, 'content')

  return {
    name: 'pf-archive-api-plugin',
    configureServer(server) {
      // Ensure content directory exists
      if (!fs.existsSync(contentDir)) {
        fs.mkdirSync(contentDir, { recursive: true })
      }

      // API 1: GET /api/posts - Read all .md files in content/
      server.middlewares.use('/api/posts', (req, res, next) => {
        if (req.method !== 'GET') return next()

        try {
          const files = fs.readdirSync(contentDir).filter(file => file.endsWith('.md'))
          const posts = files.map(filename => {
            const filePath = path.join(contentDir, filename)
            const rawText = fs.readFileSync(filePath, 'utf-8')
            const stat = fs.statSync(filePath)
            return {
              filename,
              id: filename,
              slug: filename.replace(/\.md$/, ''),
              rawText,
              lastModified: stat.mtimeMs
            }
          })

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(posts))
        } catch (err) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: err.message }))
        }
      })

      // API 2: POST /api/save-post - Save or update .md file in content/
      server.middlewares.use('/api/save-post', (req, res, next) => {
        if (req.method !== 'POST') return next()

        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          try {
            const { filename, rawText } = JSON.parse(body)
            if (!filename || !rawText) {
              res.statusCode = 400
              return res.end(JSON.stringify({ error: 'Filename and rawText required' }))
            }

            const safeFilename = filename.endsWith('.md') ? filename : `${filename}.md`
            const filePath = path.join(contentDir, safeFilename)

            fs.writeFileSync(filePath, rawText, 'utf-8')

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true, filename: safeFilename }))
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      })

      // API 3: POST /api/delete-post - Delete .md file in content/
      server.middlewares.use('/api/delete-post', (req, res, next) => {
        if (req.method !== 'POST') return next()

        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          try {
            const { filename } = JSON.parse(body)
            if (!filename) {
              res.statusCode = 400
              return res.end(JSON.stringify({ error: 'Filename required' }))
            }

            const filePath = path.join(contentDir, filename)
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath)
            }

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true }))
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      })

      // Ensure uploads directory exists in public/
      const uploadsDir = path.resolve(__dirname, 'public', 'uploads')
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true })
      }

      // API 4: POST /api/upload-image - Upload pasted image to public/uploads/
      server.middlewares.use('/api/upload-image', (req, res, next) => {
        if (req.method !== 'POST') return next()

        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          try {
            const { filename, base64 } = JSON.parse(body)
            if (!filename || !base64) {
              res.statusCode = 400
              return res.end(JSON.stringify({ error: 'Filename and base64 data required' }))
            }

            const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '')
            const buffer = Buffer.from(cleanBase64, 'base64')

            const safeFilename = path.basename(filename)
            const filePath = path.join(uploadsDir, safeFilename)

            fs.writeFileSync(filePath, buffer)

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              success: true,
              filename: safeFilename,
              url: `/uploads/${safeFilename}`
            }))
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      })
    },
    buildStart() {
      // Ensure public/api/posts.json is generated for static builds
      const apiDir = path.resolve(__dirname, 'public', 'api')
      if (!fs.existsSync(apiDir)) fs.mkdirSync(apiDir, { recursive: true })
      if (fs.existsSync(contentDir)) {
        const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'))
        const posts = files.map(filename => {
          const filePath = path.join(contentDir, filename)
          const rawText = fs.readFileSync(filePath, 'utf-8')
          const stat = fs.statSync(filePath)
          return {
            filename,
            id: filename,
            slug: filename.replace(/\.md$/, ''),
            rawText,
            lastModified: stat.mtimeMs
          }
        })
        fs.writeFileSync(path.join(apiDir, 'posts.json'), JSON.stringify(posts, null, 2), 'utf-8')
      }
    },
    closeBundle() {
      // Copy index.html to 404.html for GitHub Pages SPA routing
      const distDir = path.resolve(__dirname, 'dist')
      const indexHtml = path.join(distDir, 'index.html')
      const notFoundHtml = path.join(distDir, '404.html')
      if (fs.existsSync(indexHtml)) {
        fs.copyFileSync(indexHtml, notFoundHtml)
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/pf-archive/' : '/',
  plugins: [react(), pfArchiveApiPlugin()],
})
