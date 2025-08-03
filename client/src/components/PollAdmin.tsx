import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import type { Poll, ApiResponse } from 'shared'
import { useWebSocket } from '../hooks/useWebSocket'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001"

interface PollAdminProps {
  pollId: string
  onBack?: () => void
}

export function PollAdmin({ pollId, onBack }: PollAdminProps) {
  const [poll, setPoll] = useState<Poll | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEnding, setIsEnding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmEnd, setConfirmEnd] = useState(false)

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
      setConfirmEnd(false)
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
    } catch {
      setError('投票の読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEndPoll = async () => {
    if (!poll) return

    try {
      setIsEnding(true)
      setError(null)

      const response = await fetch(`${SERVER_URL}/api/polls/${pollId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          createdBy: poll.createdBy
        })
      })

      const result: ApiResponse<{ message: string; poll: Poll }> = await response.json()

      if (!response.ok || !result.success) {
        setError(result.success ? 'Unknown error' : result.error.message)
        return
      }

      // Update poll with ended status
      setPoll(result.data.poll)
      setConfirmEnd(false)
      
    } catch {
      setError('投票の終了に失敗しました')
    } finally {
      setIsEnding(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>投票情報を読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error && !poll) {
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
          <Button onClick={loadPoll} variant="outline">
            再試行
          </Button>
        </div>
      </div>
    )
  }

  if (!poll) return null

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h1 className="text-4xl font-bold">投票管理</h1>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-2">{poll.title}</h2>
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${poll.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`}></span>
              <span>{poll.status === 'active' ? '投票受付中' : '投票終了'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span>{isConnected ? 'リアルタイム更新中' : '接続なし'}</span>
            </div>
            <span>作成日: {new Date(poll.createdAt).toLocaleDateString('ja-JP')}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{poll.totalVotes}</div>
          <div className="text-sm text-blue-600">総投票数</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{poll.options.length}</div>
          <div className="text-sm text-green-600">選択肢数</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-purple-600">
            {poll.totalVotes > 0 ? Math.max(...poll.options.map(opt => opt.votes)) : 0}
          </div>
          <div className="text-sm text-purple-600">最高得票数</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-orange-600">
            {poll.totalVotes > 0 ? (poll.totalVotes / poll.options.length).toFixed(1) : 0}
          </div>
          <div className="text-sm text-orange-600">平均票数</div>
        </div>
      </div>

      {/* Current Results */}
      <div className="bg-white rounded-lg border p-6 mb-8">
        <h3 className="text-xl font-semibold mb-4">現在の結果</h3>
        <div className="space-y-3">
          {poll.options.map((option, index) => (
            <div key={option.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <span className="font-medium">{option.text}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-bold">{option.votes}票</div>
                  <div className="text-sm text-gray-500">({option.percentage.toFixed(1)}%)</div>
                </div>
                <div className="w-32 bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${option.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Management Actions */}
      <div className="bg-white rounded-lg border p-6 mb-8">
        <h3 className="text-xl font-semibold mb-4">管理操作</h3>
        
        {poll.status === 'active' ? (
          <div className="space-y-4">
            {!confirmEnd ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <h4 className="font-semibold text-yellow-800">投票終了</h4>
                </div>
                <p className="text-yellow-700 mb-4">
                  投票を終了すると、新しい投票を受け付けなくなります。この操作は取り消せません。
                </p>
                <Button
                  onClick={() => setConfirmEnd(true)}
                  variant="outline"
                  className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                >
                  投票を終了する
                </Button>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <h4 className="font-semibold text-red-800">最終確認</h4>
                </div>
                <p className="text-red-700 mb-4">
                  本当に投票を終了しますか？この操作は取り消せません。
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={handleEndPoll}
                    disabled={isEnding}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isEnding ? '終了中...' : '投票を終了する'}
                  </Button>
                  <Button
                    onClick={() => setConfirmEnd(false)}
                    variant="outline"
                    disabled={isEnding}
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h4 className="font-semibold text-gray-800">投票終了済み</h4>
            </div>
            <p className="text-gray-600">この投票は既に終了しています。</p>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        {onBack && (
          <Button onClick={onBack} variant="outline">
            戻る
          </Button>
        )}
        <Button 
          onClick={loadPoll} 
          variant="outline"
          className="flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          情報を更新
        </Button>
        <Button
          onClick={() => {
            const resultsUrl = `${window.location.origin}/results/${pollId}`
            window.open(resultsUrl, '_blank')
          }}
          className="flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          結果ページを開く
        </Button>
      </div>
    </div>
  )
}