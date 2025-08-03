import type { ApiErrorResponse } from 'shared/dist'

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function createErrorResponse(error: AppError): ApiErrorResponse {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details
    }
  }
}

export function createValidationError(errors: string[]): AppError {
  return new AppError(
    'VALIDATION_ERROR',
    errors[0] || 'Validation failed', // First error as main message
    { validationErrors: errors }
  )
}

// Common error creators
export const Errors = {
  pollNotFound: () => new AppError('POLL_NOT_FOUND', '指定された投票が見つかりません'),
  alreadyVoted: () => new AppError('ALREADY_VOTED', '既に投票済みです'),
  pollEnded: () => new AppError('POLL_ENDED', '投票は既に終了しています'),
  invalidOption: () => new AppError('INVALID_OPTION', '無効な選択肢です'),
  unauthorized: () => new AppError('UNAUTHORIZED', '権限がありません'),
  internalError: () => new AppError('INTERNAL_ERROR', 'システムエラーが発生しました')
}