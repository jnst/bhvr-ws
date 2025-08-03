import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import type { Poll, VoteRequest, ApiResponse } from 'shared'
import { useWebSocket } from '../hooks/useWebSocket'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001"

interface VotePageProps {
  pollId: string
  onVoteComplete?: (poll: Poll) => void
}

export function VotePage({ pollId, onVoteComplete }: VotePageProps) {
  const [poll, setPoll] = useState<Poll | null>(null)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isVoting, setIsVoting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasVoted, setHasVoted] = useState(false)

  // Simple voter ID generation (in real app, use proper auth)
  const voterId = `voter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // WebSocket connection for real-time updates
  const { isConnected } = useWebSocket({
    pollId,
    onPollUpdate: (updatedPoll) => {
      console.log('Poll updated via WebSocket:', updatedPoll)
      setPoll(updatedPoll)
    },
    onPollEnded: (endedPoll) => {
      console.log('Poll ended via WebSocket:', endedPoll)
      setPoll(endedPoll)
      setHasVoted(true)
    }
  })

  useEffect(() => {
    loadPoll()
  }, [pollId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadPoll = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`${SERVER_URL}/api/polls/${pollId}`)
      const result: ApiResponse<Poll> = await response.json()

      if (!response.ok || !result.success) {
        if (response.status === 404) {
          setError('投票が見つかりません')
        } else {
          setError(result.success ? 'Unknown error' : result.error.message)
        }
        return
      }

      setPoll(result.data)
      
      // Check if poll is ended
      if (result.data.status === 'ended') {
        setHasVoted(true)
      }

    } catch {
      setError('投票の読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVote = async () => {
    if (!selectedOption || !poll) return

    try {
      setIsVoting(true)
      setError(null)

      const voteRequest: VoteRequest = {
        optionId: selectedOption,
        voterId
      }

      const response = await fetch(`${SERVER_URL}/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(voteRequest)
      })

      const result: ApiResponse<{ votedOptionId: string; poll: Poll }> = await response.json()

      if (!response.ok || !result.success) {
        if (response.status === 409) {
          setError('既に投票済みです')
          setHasVoted(true)
        } else {
          setError(result.success ? 'Unknown error' : result.error.message)
        }
        return
      }

      // Update poll with new results
      setPoll(result.data.poll)
      setHasVoted(true)
      onVoteComplete?.(result.data.poll)

    } catch {
      setError('投票に失敗しました')
    } finally {
      setIsVoting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>投票を読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error && !poll) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">エラーが発生しました</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadPoll} variant="outline">
            再試行
          </Button>
        </div>
      </div>
    )
  }

  if (!poll) return null

  // Show results if already voted or poll ended
  if (hasVoted || poll.status === 'ended') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">{poll.title}</h1>
          <p className="text-gray-600">
            {poll.status === 'ended' ? '投票は終了しました' : '投票ありがとうございました！'}
          </p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <p className="text-sm text-gray-500">
              総投票数: {poll.totalVotes}票
            </p>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-500">
                {isConnected ? 'リアルタイム更新中' : '接続なし'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {poll.options.map((option) => (
            <div key={option.id} className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{option.text}</span>
                <span className="text-sm text-gray-600">
                  {option.votes}票 ({option.percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${option.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </div>
    )
  }

  // Show voting interface
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold mb-2">{poll.title}</h1>
        <p className="text-gray-600">選択肢から1つを選んで投票してください</p>
      </div>

      <div className="space-y-3 mb-6">
        {poll.options.map((option) => (
          <label
            key={option.id}
            className={`block p-4 border rounded-lg cursor-pointer transition-all hover:bg-blue-50 ${
              selectedOption === option.id
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-center">
              <input
                type="radio"
                name="pollOption"
                value={option.id}
                checked={selectedOption === option.id}
                onChange={(e) => setSelectedOption(e.target.value)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-3 text-lg">{option.text}</span>
            </div>
          </label>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <Button
        onClick={handleVote}
        disabled={!selectedOption || isVoting}
        className="w-full"
        size="lg"
      >
        {isVoting ? '投票中...' : '投票する'}
      </Button>
    </div>
  )
}