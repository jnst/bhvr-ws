import { Button } from './ui/button'
import type { Poll } from 'shared'

interface PollCreatedProps {
  poll: Poll
  onCreateAnother: () => void
}

export function PollCreated({ poll, onCreateAnother }: PollCreatedProps) {
  const pollUrl = `${window.location.origin}/poll/${poll.id}`
  const resultsUrl = `${window.location.origin}/results/${poll.id}`
  const adminUrl = `${window.location.origin}/admin/${poll.id}`

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // TODO: Add toast notification
      alert('URLをコピーしました')
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 text-center">
      <div className="mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg 
            className="w-8 h-8 text-green-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 13l4 4L19 7" 
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">投票を作成しました！</h1>
        <p className="text-gray-600">以下のURLを共有して投票を開始しましょう</p>
      </div>

      <div className="space-y-6">
        {/* 投票情報 */}
        <div className="bg-gray-50 p-4 rounded-lg text-left">
          <h3 className="font-semibold mb-2">{poll.title}</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            {poll.options.map((option, index) => (
              <li key={option.id} className="flex items-center">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs mr-2">
                  {index + 1}
                </span>
                {option.text}
              </li>
            ))}
          </ul>
        </div>

        {/* 投票URL */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2 text-left">
              投票URL（参加者に共有）
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={pollUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm"
              />
              <Button
                onClick={() => copyToClipboard(pollUrl)}
                variant="outline"
              >
                コピー
              </Button>
            </div>
          </div>

          {/* 結果URL */}
          <div>
            <label className="block text-sm font-medium mb-2 text-left">
              結果表示URL（リアルタイム結果確認用）
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={resultsUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm"
              />
              <Button
                onClick={() => copyToClipboard(resultsUrl)}
                variant="outline"
              >
                コピー
              </Button>
            </div>
          </div>

          {/* 管理URL */}
          <div>
            <label className="block text-sm font-medium mb-2 text-left">
              管理URL（投票終了用）
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={adminUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm"
              />
              <Button
                onClick={() => copyToClipboard(adminUrl)}
                variant="outline"
              >
                コピー
              </Button>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex flex-col gap-3 pt-4">
          <div className="flex gap-2">
            <Button
              onClick={() => window.open(pollUrl, '_blank')}
              className="flex-1"
            >
              投票ページを開く
            </Button>
            <Button
              onClick={() => window.open(resultsUrl, '_blank')}
              variant="outline"
              className="flex-1"
            >
              結果ページを開く
            </Button>
          </div>
          <Button
            onClick={onCreateAnother}
            variant="outline"
            className="w-full"
          >
            新しい投票を作成
          </Button>
        </div>
      </div>
    </div>
  )
}