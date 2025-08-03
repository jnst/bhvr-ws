import type { WebSocketMessage } from 'shared/dist'

interface WebSocketConnection {
  ws: any
  pollId: string
  clientId: string
}

export class WebSocketManager {
  private connections = new Map<string, Set<WebSocketConnection>>()

  addConnection(pollId: string, ws: any) {
    const clientId = this.generateClientId()
    const connection: WebSocketConnection = { ws, pollId, clientId }

    if (!this.connections.has(pollId)) {
      this.connections.set(pollId, new Set())
    }
    
    this.connections.get(pollId)!.add(connection)
    
    // Send initial connection confirmation (delayed to avoid recursion)
    setTimeout(() => {
      this.sendToClient(connection, {
        type: 'join-poll',
        payload: { pollId, clientId, message: 'Connected to poll' }
      })
    }, 100)
  }

  removeConnection(pollId: string, ws: any) {
    const pollConnections = this.connections.get(pollId)
    if (!pollConnections) return

    for (const connection of pollConnections) {
      if (connection.ws === ws) {
        pollConnections.delete(connection)
        break
      }
    }

    // Clean up empty poll connections
    if (pollConnections.size === 0) {
      this.connections.delete(pollId)
    }
  }

  handleMessage(pollId: string, ws: any, message: WebSocketMessage) {
    console.log(`WebSocket message for poll ${pollId}:`, message)
    
    // Handle different message types as needed
    switch (message.type) {
      case 'join-poll':
        // Already handled in addConnection
        break
      default:
        console.log(`Unknown message type: ${message.type}`)
    }
  }

  broadcastToPoll(pollId: string, message: WebSocketMessage) {
    const pollConnections = this.connections.get(pollId)
    if (!pollConnections) return

    const messageStr = JSON.stringify(message)
    
    for (const connection of pollConnections) {
      try {
        connection.ws.send(messageStr)
      } catch (error) {
        console.error('Error sending WebSocket message:', error)
        // Remove failed connection
        pollConnections.delete(connection)
      }
    }
  }

  sendToClient(connection: WebSocketConnection, message: WebSocketMessage) {
    try {
      connection.ws.send(JSON.stringify(message))
    } catch (error) {
      console.error('Error sending WebSocket message to client:', error)
    }
  }

  getConnectionCount(pollId: string): number {
    return this.connections.get(pollId)?.size || 0
  }

  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}