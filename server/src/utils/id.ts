export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function generatePollId(): string {
  return 'poll-' + generateId()
}

export function generateVoteId(): string {
  return 'vote-' + generateId()
}

export function generateOptionId(): string {
  return 'opt-' + generateId()
}