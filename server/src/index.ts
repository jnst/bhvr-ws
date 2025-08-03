import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { ApiResponse } from 'shared/dist'
import polls from './routes/polls'
// Temporarily disable WebSocket to isolate the issue
// import { wsManager } from './services/websocket-singleton'

const app = new Hono()

app.use(cors())

app.get('/', (c) => {
  return c.text('Realtime Voting Service API')
})

app.get('/hello', async (c) => {

  const data: ApiResponse<{ message: string }> = {
    success: true,
    data: {
      message: "Hello BHVR!"
    }
  }

  return c.json(data, { status: 200 })
})

// WebSocket info endpoint (moved to avoid conflict)
app.get('/api/ws/:pollId', async (c) => {
  const pollId = c.req.param('pollId')
  return c.json({ 
    message: `WebSocket endpoint for poll ${pollId}`,
    endpoint: `ws://localhost:3001/ws/${pollId}`
  })
})

// API routes  
app.route('/api/polls', polls)

// Temporarily use simple HTTP server without WebSocket to isolate the issue
const server = Bun.serve({
  port: 3001,
  fetch: app.fetch
})

console.log(`Server running on http://localhost:${server.port}`)

export default server
