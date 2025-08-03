import { useState } from 'react'
import { Poll } from 'shared'
import { CreatePollForm } from './components/CreatePollForm'
import { PollCreated } from './components/PollCreated'
import { VotePage } from './components/VotePage'
import { PollResults } from './components/PollResults'
import { PollAdmin } from './components/PollAdmin'
import { Button } from './components/ui/button'

type AppState = 'home' | 'create' | 'created' | 'vote' | 'results' | 'admin'

function App() {
  const [currentState, setCurrentState] = useState<AppState>('home')
  const [createdPoll, setCreatedPoll] = useState<Poll | null>(null)
  const [votePollId, setVotePollId] = useState<string>('')
  const [voteUrlInput, setVoteUrlInput] = useState<string>('')
  const [resultsPollId, setResultsPollId] = useState<string>('')
  const [adminPollId, setAdminPollId] = useState<string>('')

  const handlePollCreated = (poll: Poll) => {
    setCreatedPoll(poll)
    setCurrentState('created')
  }

  const handleCreateAnother = () => {
    setCreatedPoll(null)
    setCurrentState('create')
  }

  const handleBackToHome = () => {
    setCreatedPoll(null)
    setVotePollId('')
    setVoteUrlInput('')
    setResultsPollId('')
    setAdminPollId('')
    setCurrentState('home')
  }

  const handleJoinPoll = () => {
    // Extract poll ID from URL or use as direct ID
    let pollId = voteUrlInput.trim()
    
    // If it's a full URL, extract the ID
    const pollMatch = pollId.match(/\/poll\/([^/?#]+)/)
    const resultsMatch = pollId.match(/\/results\/([^/?#]+)/)
    const adminMatch = pollId.match(/\/admin\/([^/?#]+)/)
    
    if (pollMatch) {
      pollId = pollMatch[1]
      setVotePollId(pollId)
      setCurrentState('vote')
    } else if (resultsMatch) {
      pollId = resultsMatch[1]
      setResultsPollId(pollId)
      setCurrentState('results')
    } else if (adminMatch) {
      pollId = adminMatch[1]
      setAdminPollId(pollId)
      setCurrentState('admin')
    } else if (pollId) {
      setVotePollId(pollId)
      setCurrentState('vote')
    }
  }

  const handleVoteComplete = () => {
    // Stay on vote page to show results
  }

  if (currentState === 'admin' && adminPollId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-8">
          <Button
            onClick={handleBackToHome}
            variant="outline"
            className="mb-4"
          >
            ← ホームに戻る
          </Button>
          <PollAdmin 
            pollId={adminPollId}
            onBack={handleBackToHome}
          />
        </div>
      </div>
    )
  }

  if (currentState === 'results' && resultsPollId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-8">
          <Button
            onClick={handleBackToHome}
            variant="outline"
            className="mb-4"
          >
            ← ホームに戻る
          </Button>
          <PollResults 
            pollId={resultsPollId}
            onBack={handleBackToHome}
          />
        </div>
      </div>
    )
  }

  if (currentState === 'vote' && votePollId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-8">
          <Button
            onClick={handleBackToHome}
            variant="outline"
            className="mb-4"
          >
            ← ホームに戻る
          </Button>
          <VotePage 
            pollId={votePollId} 
            onVoteComplete={handleVoteComplete}
          />
        </div>
      </div>
    )
  }

  if (currentState === 'create') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-8">
          <Button
            onClick={handleBackToHome}
            variant="outline"
            className="mb-4"
          >
            ← ホームに戻る
          </Button>
          <CreatePollForm onPollCreated={handlePollCreated} />
        </div>
      </div>
    )
  }

  if (currentState === 'created' && createdPoll) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-8">
          <Button
            onClick={handleBackToHome}
            variant="outline"
            className="mb-4"
          >
            ← ホームに戻る
          </Button>
          <PollCreated 
            poll={createdPoll} 
            onCreateAnother={handleCreateAnother}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-xl mx-auto text-center p-6">
        <h1 className="text-5xl font-black mb-4">リアルタイム投票</h1>
        <p className="text-xl text-gray-600 mb-8">
          簡単に投票を作成して、リアルタイムで結果を共有しよう
        </p>
        
        <div className="space-y-4">
          <Button
            onClick={() => setCurrentState('create')}
            size="lg"
            className="w-full sm:w-auto px-8"
          >
            新しい投票を作成
          </Button>
          
          <div className="text-sm text-gray-500">
            または投票・結果・管理URLを入力
          </div>
          
          <div className="flex gap-2 max-w-md mx-auto">
            <input
              type="text"
              placeholder="投票・結果・管理URL または ID を入力..."
              value={voteUrlInput}
              onChange={(e) => setVoteUrlInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinPoll()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button 
              variant="outline"
              onClick={handleJoinPoll}
              disabled={!voteUrlInput.trim()}
            >
              参加
            </Button>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            リアルタイム投票サービス - 即座に結果が更新されます
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
