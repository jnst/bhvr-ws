import type { Poll, PollOption, Vote } from 'shared/dist'

export class DataStore {
  private polls = new Map<string, Poll>()
  private votes = new Map<string, Vote[]>()
  private pollVoters = new Map<string, Set<string>>()

  // Poll operations
  createPoll(poll: Poll): Poll {
    this.polls.set(poll.id, poll)
    this.votes.set(poll.id, [])
    this.pollVoters.set(poll.id, new Set())
    return poll
  }

  getPoll(id: string): Poll | undefined {
    return this.polls.get(id)
  }

  updatePoll(id: string, updates: Partial<Poll>): Poll | undefined {
    const poll = this.polls.get(id)
    if (!poll) return undefined
    
    const updatedPoll = { ...poll, ...updates }
    this.polls.set(id, updatedPoll)
    return updatedPoll
  }

  // Vote operations
  addVote(vote: Vote): boolean {
    const poll = this.polls.get(vote.pollId)
    if (!poll) return false

    // Check for duplicate voting
    const voters = this.pollVoters.get(vote.pollId) || new Set()
    if (voters.has(vote.voterId)) {
      return false
    }

    // Add vote
    const votes = this.votes.get(vote.pollId) || []
    votes.push(vote)
    this.votes.set(vote.pollId, votes)
    
    // Track voter
    voters.add(vote.voterId)
    this.pollVoters.set(vote.pollId, voters)

    return true
  }

  hasVoted(pollId: string, voterId: string): boolean {
    const voters = this.pollVoters.get(pollId) || new Set()
    return voters.has(voterId)
  }

  getVotes(pollId: string): Vote[] {
    return this.votes.get(pollId) || []
  }

  // Aggregate results
  aggregateResults(pollId: string): PollOption[] {
    const poll = this.polls.get(pollId)
    const votes = this.votes.get(pollId) || []
    const totalVotes = votes.length

    if (!poll) return []

    return poll.options.map(option => {
      const optionVotes = votes.filter(v => v.optionId === option.id).length
      return {
        ...option,
        votes: optionVotes,
        percentage: totalVotes > 0 ? (optionVotes / totalVotes) * 100 : 0
      }
    })
  }

  // Update poll with current results
  getPollWithResults(pollId: string): Poll | undefined {
    const poll = this.polls.get(pollId)
    if (!poll) return undefined

    const updatedOptions = this.aggregateResults(pollId)
    const totalVotes = this.getVotes(pollId).length

    return {
      ...poll,
      options: updatedOptions,
      totalVotes
    }
  }

  // Utility methods
  getAllPolls(): Poll[] {
    return Array.from(this.polls.values())
  }

  deletePoll(id: string): boolean {
    const deleted = this.polls.delete(id)
    this.votes.delete(id)
    this.pollVoters.delete(id)
    return deleted
  }
}

// Singleton instance
export const dataStore = new DataStore()