import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { spawn, spawnSync } from 'child_process'

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

      // API 5: POST /api/upload-video - transcode a dropped/pasted clip with ffmpeg (720p max, H.264 CRF 28,
      // 64 kbps AAC) into public/uploads/. Raw binary body; the original name comes in the x-filename header.
      server.middlewares.use('/api/upload-video', (req, res, next) => {
        if (req.method !== 'POST') return next()
        res.setHeader('Content-Type', 'application/json')
        const fail = (status, error) => {
          res.statusCode = status
          res.end(JSON.stringify({ error }))
        }

        const probe = spawnSync('ffmpeg', ['-version'])
        if (probe.error || probe.status !== 0) {
          return fail(503, 'ffmpeg를 찾을 수 없어 영상을 압축할 수 없습니다. ffmpeg를 설치하고 PATH에 추가한 뒤 개발 서버를 다시 시작하거나, 유튜브 [[링크]]를 사용하세요.')
        }

        const chunks = []
        req.on('data', chunk => chunks.push(chunk))
        req.on('end', () => {
          const uploadsDir = path.resolve(__dirname, 'public', 'uploads')
          if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

          const stamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)
          const id = Math.random().toString(36).substring(2, 7)
          const inputPath = path.join(uploadsDir, `.tmp_${stamp}_${id}.input`)
          const outName = `vid_${stamp}_${id}.mp4`
          const outPath = path.join(uploadsDir, outName)
          fs.writeFileSync(inputPath, Buffer.concat(chunks))

          const args = [
            '-y', '-i', inputPath,
            '-vf', "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
            '-c:v', 'libx264', '-crf', '28', '-preset', 'medium', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '64k',
            '-movflags', '+faststart',
            outPath,
          ]
          const ff = spawn('ffmpeg', args)
          let stderr = ''
          ff.stderr.on('data', d => { stderr += d })
          ff.on('error', err => {
            fs.rmSync(inputPath, { force: true })
            fail(500, `ffmpeg 실행 실패: ${err.message}`)
          })
          ff.on('close', code => {
            fs.rmSync(inputPath, { force: true })
            if (code !== 0) {
              fs.rmSync(outPath, { force: true })
              return fail(500, `영상 압축에 실패했습니다: ${stderr.split('\n').slice(-4).join(' ').trim()}`)
            }
            const size = fs.statSync(outPath).size
            const body = { success: true, filename: outName, url: `/uploads/${outName}`, size }
            if (size > 8 * 1024 * 1024) {
              body.warning = `압축 후에도 ${(size / 1024 / 1024).toFixed(1)}MB입니다. 페이지가 무거워지니 유튜브 [[링크]] 사용을 권장합니다.`
            }
            res.end(JSON.stringify(body))
          })
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
      const distDir = path.resolve(__dirname, 'dist')
      const indexHtmlPath = path.join(distDir, 'index.html')
      const notFoundHtml = path.join(distDir, '404.html')

      if (!fs.existsSync(indexHtmlPath)) return

      // 1. Copy index.html to 404.html for GitHub Pages SPA routing
      fs.copyFileSync(indexHtmlPath, notFoundHtml)

      // 2. Pre-generate per-post static HTML for Discord / Open Graph rich embeds
      if (!fs.existsSync(contentDir)) return

      const templateHtml = fs.readFileSync(indexHtmlPath, 'utf-8')
      const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'))

      function escapeHtml(str) {
        if (!str) return ''
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;')
      }

      function parsePost(rawText, filename) {
        let title = filename.replace(/\.md$/, '')
        let summary = ''
        let ogImage = ''

        const fmMatch = rawText.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
        let content = rawText
        if (fmMatch) {
          content = fmMatch[2]
          const lines = fmMatch[1].split(/\r?\n/)
          for (const line of lines) {
            const idx = line.indexOf(':')
            if (idx !== -1) {
              const k = line.slice(0, idx).trim()
              let v = line.slice(idx + 1).trim()
              if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
                v = v.slice(1, -1)
              }
              if (k === 'title') title = v
              if (k === 'summary') summary = v
              if (k === 'cover' || k === 'image') ogImage = v
            }
          }
        }

        // Extract first image if no cover provided
        if (!ogImage) {
          const imgMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s\)]+|\/uploads\/[^\s\)]+)\)/)
          if (imgMatch) {
            ogImage = imgMatch[1]
          }
        }

        if (ogImage && ogImage.startsWith('/')) {
          ogImage = 'https://yusi0.github.io/pf-archive' + ogImage
        }

        // Clean summary fallback if empty
        if (!summary) {
          const textLines = content
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(l => l && !l.startsWith('#') && !l.startsWith(':::') && !l.startsWith('|') && !l.startsWith('!['))
          if (textLines.length > 0) {
            summary = textLines[0].replace(/[*_~`=]|\[.*?#.*?\]/g, '').slice(0, 150)
          } else {
            summary = 'Phantom Forces 패치노트 아카이브 기록입니다.'
          }
        }

        return { title, summary, ogImage }
      }

      const postBaseDir = path.join(distDir, 'post')
      if (!fs.existsSync(postBaseDir)) fs.mkdirSync(postBaseDir, { recursive: true })

      for (const filename of files) {
        const filePath = path.join(contentDir, filename)
        const rawText = fs.readFileSync(filePath, 'utf-8')
        const { title, summary, ogImage } = parsePost(rawText, filename)
        const slug = filename.replace(/\.md$/, '')
        const postUrl = `https://yusi0.github.io/pf-archive/post/${slug}`

        // Clean out default title and OG tags from template
        let postHtml = templateHtml
          .replace(/<title>[\s\S]*?<\/title>/i, '')
          .replace(/<meta\s+name=["']description["'][\s\S]*?>/i, '')
          .replace(/<meta\s+property=["']og:[^"']*["'][\s\S]*?>/gi, '')
          .replace(/<meta\s+property=["']twitter:[^"']*["'][\s\S]*?>/gi, '')
          .replace(/<meta\s+name=["']theme-color["'][\s\S]*?>/gi, '')

        const customMetaTags = [
          `<title>${escapeHtml(title)} | PF Archive</title>`,
          `<meta name="description" content="${escapeHtml(summary)}" />`,
          `<!-- Open Graph / Discord Embed -->`,
          `<meta property="og:type" content="article" />`,
          `<meta property="og:site_name" content="PF Archive" />`,
          `<meta property="og:url" content="${postUrl}" />`,
          `<meta property="og:title" content="${escapeHtml(title)}" />`,
          `<meta property="og:description" content="${escapeHtml(summary)}" />`,
          ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}" />` : '',
          `<meta name="theme-color" content="#2563eb" />`,
          `<!-- Twitter Card -->`,
          `<meta property="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}" />`,
          `<meta property="twitter:url" content="${postUrl}" />`,
          `<meta property="twitter:title" content="${escapeHtml(title)}" />`,
          `<meta property="twitter:description" content="${escapeHtml(summary)}" />`,
          ogImage ? `<meta property="twitter:image" content="${escapeHtml(ogImage)}" />` : ''
        ].filter(Boolean).join('\n  ')

        postHtml = postHtml.replace('</head>', `  ${customMetaTags}\n</head>`)

        // 1) Write to dist/post/${slug}/index.html
        const slugDir = path.join(postBaseDir, slug)
        if (!fs.existsSync(slugDir)) fs.mkdirSync(slugDir, { recursive: true })
        fs.writeFileSync(path.join(slugDir, 'index.html'), postHtml, 'utf-8')

        // 2) Write to dist/post/${slug}.html
        fs.writeFileSync(path.join(postBaseDir, `${slug}.html`), postHtml, 'utf-8')

        // 3) Backwards-compatibility for 2026-10-03-01: also generate old slug folder
        if (slug === '2026-10-03-01') {
          const oldSlugDir = path.join(postBaseDir, '2026-10-03-prod-server---11170-업데이트')
          if (!fs.existsSync(oldSlugDir)) fs.mkdirSync(oldSlugDir, { recursive: true })
          fs.writeFileSync(path.join(oldSlugDir, 'index.html'), postHtml, 'utf-8')
        }
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/pf-archive/' : '/',
  plugins: [react(), pfArchiveApiPlugin()],
})
