import { Hono } from 'hono'
import type { Poll, PollOption, Vote, CreatePollRequest, VoteRequest, ApiResponse, WebSocketMessage } from 'shared/dist'
import { dataStore } from '../data/store'
import { validatePollCreation, validateVote, sanitizePollData } from '../utils/validation'
import { AppError, createErrorResponse, createValidationError, Errors } from '../utils/errors'
import { generatePollId, generateOptionId, generateVoteId } from '../utils/id'
// Temporarily disable WebSocket to isolate the issue
// import { wsManager } from '../services/websocket-singleton'

const polls = new Hono()

// Create poll
polls.post('/', async (c) => {
  try {
    const body = await c.req.json()
    
    // Validate request
    const validation = validatePollCreation(body)
    if (!validation.isValid) {
      const error = createValidationError(validation.errors)
      return c.json(createErrorResponse(error), 400)
    }

    // Sanitize data
    const sanitized = sanitizePollData(body as CreatePollRequest)
    
    // Create poll
    const pollId = generatePollId()
    const now = new Date()
    
    const options: PollOption[] = sanitized.options.map(text => ({
      id: generateOptionId(),
      text,
      votes: 0,
      percentage: 0
    }))

    const poll: Poll = {
      id: pollId,
      title: sanitized.title,
      options,
      status: 'active',
      createdAt: now,
      createdBy: 'anonymous', // TODO: Implement proper user management
      totalVotes: 0
    }

    const createdPoll = dataStore.createPoll(poll)
    
    const response: ApiResponse<Poll> = {
      success: true,
      data: createdPoll
    }

    return c.json(response, 201)
  } catch (error) {
    console.error('Error creating poll:', error)
    const appError = Errors.internalError()
    return c.json(createErrorResponse(appError), 500)
  }
})

// Get poll
polls.get('/:id', async (c) => {
  try {
    const pollId = c.req.param('id')
    const poll = dataStore.getPollWithResults(pollId)
    
    if (!poll) {
      const error = Errors.pollNotFound()
      return c.json(createErrorResponse(error), 404)
    }

    const response: ApiResponse<Poll> = {
      success: true,
      data: poll
    }

    return c.json(response)
  } catch (error) {
    console.error('Error getting poll:', error)
    const appError = Errors.internalError()
    return c.json(createErrorResponse(appError), 500)
  }
})

// Vote on poll
polls.post('/:id/vote', async (c) => {
  try {
    const pollId = c.req.param('id')
    const body = await c.req.json()
    
    // Validate request
    const validation = validateVote(body)
    if (!validation.isValid) {
      const error = createValidationError(validation.errors)
      return c.json(createErrorResponse(error), 400)
    }

    const voteRequest = body as VoteRequest
    
    // Check if poll exists
    const poll = dataStore.getPoll(pollId)
    if (!poll) {
      const error = Errors.pollNotFound()
      return c.json(createErrorResponse(error), 404)
    }

    // Check if poll is active
    if (poll.status !== 'active') {
      const error = Errors.pollEnded()
      return c.json(createErrorResponse(error), 409)
    }

    // Check if option exists
    const option = poll.options.find(opt => opt.id === voteRequest.optionId)
    if (!option) {
      const error = Errors.invalidOption()
      return c.json(createErrorResponse(error), 400)
    }

    // Check for duplicate vote
    if (dataStore.hasVoted(pollId, voteRequest.voterId)) {
      const error = Errors.alreadyVoted()
      return c.json(createErrorResponse(error), 409)
    }

    // Create vote
    const vote: Vote = {
      id: generateVoteId(),
      pollId,
      optionId: voteRequest.optionId,
      voterId: voteRequest.voterId,
      timestamp: new Date()
    }

    // Add vote
    const success = dataStore.addVote(vote)
    if (!success) {
      const error = Errors.alreadyVoted()
      return c.json(createErrorResponse(error), 409)
    }

    // Get updated poll with results
    const updatedPoll = dataStore.getPollWithResults(pollId)
    
    // Temporarily disable WebSocket broadcasting
    console.log('Vote recorded for poll:', pollId, 'option:', voteRequest.optionId)
    
    const response: ApiResponse<{ votedOptionId: string; poll: Poll }> = {
      success: true,
      data: {
        votedOptionId: voteRequest.optionId,
        poll: updatedPoll!
      }
    }

    return c.json(response)
  } catch (error) {
    console.error('Error voting:', error)
    const appError = Errors.internalError()
    return c.json(createErrorResponse(appError), 500)
  }
})

// Get poll results
polls.get('/:id/results', async (c) => {
  try {
    const pollId = c.req.param('id')
    const poll = dataStore.getPollWithResults(pollId)
    
    if (!poll) {
      const error = Errors.pollNotFound()
      return c.json(createErrorResponse(error), 404)
    }

    const response: ApiResponse<{
      pollId: string
      title: string
      results: PollOption[]
      totalVotes: number
      status: string
      createdAt: Date
    }> = {
      success: true,
      data: {
        pollId: poll.id,
        title: poll.title,
        results: poll.options,
        totalVotes: poll.totalVotes,
        status: poll.status,
        createdAt: poll.createdAt
      }
    }

    return c.json(response)
  } catch (error) {
    console.error('Error getting results:', error)
    const appError = Errors.internalError()
    return c.json(createErrorResponse(appError), 500)
  }
})

// End poll (admin function)
polls.post('/:id/end', async (c) => {
  try {
    const pollId = c.req.param('id')
    const body = await c.req.json()
    
    const poll = dataStore.getPoll(pollId)
    if (!poll) {
      const error = Errors.pollNotFound()
      return c.json(createErrorResponse(error), 404)
    }

    // TODO: Implement proper authorization
    // For now, just check if createdBy matches
    if (body.createdBy && poll.createdBy !== body.createdBy) {
      const error = Errors.unauthorized()
      return c.json(createErrorResponse(error), 403)
    }

    // End poll
    const endedPoll = dataStore.updatePoll(pollId, { status: 'ended' })
    if (!endedPoll) {
      const error = Errors.internalError()
      return c.json(createErrorResponse(error), 500)
    }

    const finalPoll = dataStore.getPollWithResults(pollId)
    
    // Temporarily disable WebSocket broadcasting
    console.log('Poll ended:', pollId)
    
    const response: ApiResponse<{ message: string; poll: Poll }> = {
      success: true,
      data: {
        message: '投票が終了しました',
        poll: finalPoll!
      }
    }

    return c.json(response)
  } catch (error) {
    console.error('Error ending poll:', error)
    const appError = Errors.internalError()
    return c.json(createErrorResponse(appError), 500)
  }
})

export default polls