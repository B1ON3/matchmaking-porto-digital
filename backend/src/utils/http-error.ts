export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new HttpError(400, message, details);
  }

  static unauthorized(message = 'Token ausente ou invalido') {
    return new HttpError(401, message);
  }

  static forbidden(message = 'Voce nao tem permissao pra fazer isso') {
    return new HttpError(403, message);
  }

  static notFound(message = 'Recurso nao encontrado') {
    return new HttpError(404, message);
  }

  static conflict(message: string) {
    return new HttpError(409, message);
  }
}