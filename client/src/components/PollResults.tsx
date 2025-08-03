import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import type { Poll } from 'shared'
import { useWebSocket } from '../hooks/useWebSocket'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001"

interface PollResultsProps {
  pollId: string
  onBack?: () => void
}

export function PollResults({ pollId, onBack }: PollResultsProps) {
  const [poll, setPoll] = useState<Poll | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // WebSocket connection for real-time updates
  const { isConnected } = useWebSocket({
    pollId,
    onPollUpdate: (updatedPoll) => {
      console.log('Poll results updated via WebSocket:', updatedPoll)
      setPoll(updatedPoll)
    },
    onPollEnded: (endedPoll) => {
      console.log('Poll ended via WebSocket:', endedPoll)
      setPoll(endedPoll)
    }
  })

  useEffect(() => {
    loadPollResults()
  }, [pollId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadPollResults = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`${SERVER_URL}/api/polls/${pollId}/results`)
      if (!response.ok) {
        throw new Error('投票結果の取得に失敗しました')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error?.message || '投票結果の取得に失敗しました')
      }

      // Convert results to Poll format
      const pollData: Poll = {
        id: result.data.pollId,
        title: result.data.title,
        options: result.data.results,
        status: result.data.status,
        createdAt: new Date(result.data.createdAt),
        createdBy: 'anonymous',
        totalVotes: result.data.totalVotes
      }

      setPoll(pollData)
    } catch (err) {
      setError(err instanceof Error ? err.message : '投票結果の読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>投票結果を読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error || !poll) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">エラーが発生しました</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadPollResults} variant="outline">
            再試行
          </Button>
        </div>
      </div>
    )
  }

  const maxVotes = Math.max(...poll.options.map(opt => opt.votes))
  const topOptions = poll.options.filter(opt => opt.votes === maxVotes && maxVotes > 0)

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">{poll.title}</h1>
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{poll.totalVotes}</div>
            <div className="text-sm text-gray-500">総投票数</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{poll.options.length}</div>
            <div className="text-sm text-gray-500">選択肢</div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-500">
              {isConnected ? 'リアルタイム更新中' : '接続なし'}
            </span>
          </div>
        </div>
        <div className="mt-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            poll.status === 'active' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {poll.status === 'active' ? '投票受付中' : '投票終了'}
          </span>
        </div>
      </div>

      {/* Winner announcement */}
      {poll.totalVotes > 0 && topOptions.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-6 mb-8">
          <div className="text-center">
            <div className="text-2xl mb-2">🏆</div>
            <h2 className="text-xl font-bold mb-2">
              {topOptions.length === 1 ? '第1位' : `同率1位 (${topOptions.length}項目)`}
            </h2>
            <div className="space-y-2">
              {topOptions.map(option => (
                <div key={option.id} className="text-lg font-semibold text-gray-800">
                  {option.text} - {option.votes}票 ({option.percentage.toFixed(1)}%)
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results chart */}
      <div className="space-y-4 mb-8">
        {poll.options.map((option, index) => (
          <div key={option.id} className="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <span className="font-semibold text-lg">{option.text}</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{option.votes}</div>
                <div className="text-sm text-gray-500">票 ({option.percentage.toFixed(1)}%)</div>
              </div>
            </div>
            
            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                  style={{ width: `${option.percentage}%` }}
                >
                  {option.percentage > 0 && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                  )}
                </div>
              </div>
              <div className="text-right mt-1">
                <span className="text-xs text-gray-400">
                  最大値に対する比率: {maxVotes > 0 ? ((option.votes / maxVotes) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {poll.totalVotes > 0 ? (poll.totalVotes / poll.options.length).toFixed(1) : 0}
          </div>
          <div className="text-sm text-blue-600">平均票数</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {maxVotes}
          </div>
          <div className="text-sm text-green-600">最高得票数</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {new Date(poll.createdAt).toLocaleDateString('ja-JP')}
          </div>
          <div className="text-sm text-purple-600">作成日</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4">
        {onBack && (
          <Button onClick={onBack} variant="outline">
            戻る
          </Button>
        )}
        <Button 
          onClick={loadPollResults} 
          variant="outline"
          className="flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          結果を更新
        </Button>
        <Button
          onClick={() => {
            const resultsUrl = `${window.location.origin}/results/${pollId}`
            navigator.clipboard.writeText(resultsUrl)
            alert('結果ページのURLをコピーしました')
          }}
          className="flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          結果URLをコピー
        </Button>
      </div>
    </div>
  )
}