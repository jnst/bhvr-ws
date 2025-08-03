import { useEffect, useRef, useState } from 'react'
import type { WebSocketMessage, Poll } from 'shared'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001"

interface UseWebSocketOptions {
  pollId: string
  onPollUpdate?: (poll: Poll) => void
  onPollEnded?: (poll: Poll) => void
  onVoteRecorded?: (data: unknown) => void
}

export function useWebSocket({ pollId, onPollUpdate, onPollEnded, onVoteRecorded }: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    try {
      const wsUrl = SERVER_URL.replace('http://', 'ws://').replace('https://', 'wss://')
      const ws = new WebSocket(`${wsUrl}/ws/${pollId}`)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setError(null)
        reconnectAttempts.current = 0
      }

      ws.onmessage = (event) => {
        try {
          // Ensure event.data is not empty
          if (!event.data || event.data.trim() === '') {
            console.warn('Received empty WebSocket message')
            return
          }

          const message: WebSocketMessage = JSON.parse(event.data)
          console.log('WebSocket message received:', message)

          switch (message.type) {
            case 'join-poll':
              console.log('Joined poll:', message.payload)
              break

            case 'poll-updated':
              if (onPollUpdate && message.payload.poll) {
                onPollUpdate(message.payload.poll)
              }
              break

            case 'poll-ended':
              if (onPollEnded && message.payload.poll) {
                onPollEnded(message.payload.poll)
              }
              break

            case 'vote-recorded':
              if (onVoteRecorded) {
                onVoteRecorded(message.payload)
              }
              break

            default:
              console.log('Unknown WebSocket message type:', message.type)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
          console.error('Raw message data:', event.data)
        }
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        wsRef.current = null

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000
          reconnectAttempts.current++
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`)
            connect()
          }, delay)
        } else {
          setError('接続が失われました。ページをリロードしてください。')
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setError('WebSocket接続エラーが発生しました')
      }

    } catch (error) {
      console.error('Error creating WebSocket:', error)
      setError('WebSocket接続の作成に失敗しました')
    }
  }

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setIsConnected(false)
    reconnectAttempts.current = 0
  }

  const sendMessage = (message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected')
    }
  }

  useEffect(() => {
    if (pollId) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [pollId]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isConnected,
    error,
    connect,
    disconnect,
    sendMessage
  }
}