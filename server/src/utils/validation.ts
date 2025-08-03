import type { CreatePollRequest, VoteRequest } from 'shared/dist'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export function validatePollCreation(data: any): ValidationResult {
  const errors: string[] = []

  // Check if data exists
  if (!data) {
    errors.push('Request body is required')
    return { isValid: false, errors }
  }

  // Validate title
  if (!data.title) {
    errors.push('タイトルは必須です')
  } else if (typeof data.title !== 'string') {
    errors.push('タイトルは文字列である必要があります')
  } else if (data.title.trim().length === 0) {
    errors.push('タイトルは必須です')
  } else if (data.title.length > 200) {
    errors.push('タイトルは200文字以内で入力してください')
  }

  // Validate options
  if (!data.options) {
    errors.push('選択肢は必須です')
  } else if (!Array.isArray(data.options)) {
    errors.push('選択肢は配列である必要があります')
  } else if (data.options.length < 2) {
    errors.push('選択肢は最低2個必要です')
  } else if (data.options.length > 10) {
    errors.push('選択肢は最大10個までです')
  } else {
    // Validate each option
    for (let i = 0; i < data.options.length; i++) {
      const option = data.options[i]
      if (typeof option !== 'string') {
        errors.push(`選択肢${i + 1}は文字列である必要があります`)
      } else if (option.trim().length === 0) {
        errors.push(`選択肢${i + 1}は空にできません`)
      } else if (option.length > 100) {
        errors.push(`選択肢${i + 1}は100文字以内で入力してください`)
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function validateVote(data: any): ValidationResult {
  const errors: string[] = []

  if (!data) {
    errors.push('Request body is required')
    return { isValid: false, errors }
  }

  if (!data.optionId) {
    errors.push('選択肢IDは必須です')
  } else if (typeof data.optionId !== 'string') {
    errors.push('選択肢IDは文字列である必要があります')
  }

  if (!data.voterId) {
    errors.push('投票者IDは必須です')
  } else if (typeof data.voterId !== 'string') {
    errors.push('投票者IDは文字列である必要があります')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function sanitizeHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '')
}

export function sanitizePollData(data: CreatePollRequest): CreatePollRequest {
  return {
    title: sanitizeHtml(data.title.trim()),
    options: data.options.map(option => sanitizeHtml(option.trim()))
  }
}