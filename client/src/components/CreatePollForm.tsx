import { useState } from 'react'
import { Button } from './ui/button'
import type { CreatePollRequest, ApiResponse, Poll } from 'shared'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001"

interface CreatePollFormProps {
  onPollCreated?: (poll: Poll) => void
}

export function CreatePollForm({ onPollCreated }: CreatePollFormProps) {
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ''])
    }
  }

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const validateForm = (): string | null => {
    if (!title.trim()) {
      return 'タイトルは必須です'
    }
    
    if (title.length > 200) {
      return 'タイトルは200文字以内で入力してください'
    }

    const validOptions = options.filter(opt => opt.trim().length > 0)
    if (validOptions.length < 2) {
      return '選択肢は最低2個必要です'
    }

    for (let i = 0; i < options.length; i++) {
      const option = options[i]
      if (option.trim().length > 0 && option.length > 100) {
        return `選択肢${i + 1}は100文字以内で入力してください`
      }
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const validOptions = options.filter(opt => opt.trim().length > 0)
      const requestData: CreatePollRequest = {
        title: title.trim(),
        options: validOptions.map(opt => opt.trim())
      }

      const response = await fetch(`${SERVER_URL}/api/polls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      const result: ApiResponse<Poll> = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.success ? 'Unknown error' : result.error.message)
      }

      // 成功時
      onPollCreated?.(result.data)
      
      // フォームリセット
      setTitle('')
      setOptions(['', ''])
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">新しい投票を作成</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* タイトル入力 */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-2">
            投票タイトル *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="投票の質問を入力してください"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={200}
          />
          <p className="text-sm text-gray-500 mt-1">
            {title.length}/200文字
          </p>
        </div>

        {/* 選択肢入力 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            選択肢 * (最低2個、最大10個)
          </label>
          <div className="space-y-3">
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`選択肢 ${index + 1}`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={100}
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeOption(index)}
                    className="px-3"
                  >
                    削除
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          {options.length < 10 && (
            <Button
              type="button"
              variant="outline"
              onClick={addOption}
              className="mt-3"
            >
              選択肢を追加
            </Button>
          )}
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* 送信ボタン */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? '作成中...' : '投票を作成'}
        </Button>
      </form>
    </div>
  )
}