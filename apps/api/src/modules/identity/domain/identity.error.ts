export class IdentityError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryAfterSeconds?: number,
  ) { super(message); this.name = 'IdentityError' }
}

export class IdentityUnavailableError extends IdentityError {
  constructor() { super(503, 'IDENTITY_UNAVAILABLE', 'Chức năng tài khoản FR12 chưa sẵn sàng.'); this.name = 'IdentityUnavailableError' }
}
export const invalidCredentials = () => new IdentityError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không chính xác')
export const duplicateEmail = () => new IdentityError(409, 'EMAIL_ALREADY_REGISTERED', 'Email đã được đăng ký.')
export const receiptConflict = () => new IdentityError(409, 'IDEMPOTENCY_CONFLICT', 'Khóa đăng ký đã được dùng với nội dung khác.')
export const csrfRejected = () => new IdentityError(403, 'CSRF_REJECTED', 'Yêu cầu tài khoản không được chấp nhận.')
export const tooManyAttempts = (seconds: number) => new IdentityError(429, 'AUTH_RATE_LIMIT', 'Có quá nhiều yêu cầu tài khoản. Vui lòng thử lại sau.', seconds)
