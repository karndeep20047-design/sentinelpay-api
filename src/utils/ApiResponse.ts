import { Response } from 'express';

interface SuccessBody<T> {
  success: true;
  message: string;
  data?: T;
}

interface ErrorBody {
  success: false;
  message: string;
  error?: string;
}

export class ApiResponse {
  static success<T>(
    res: Response,
    message: string,
    data?: T,
    status = 200
  ): Response<SuccessBody<T>> {
    const body: SuccessBody<T> = { success: true, message };
    if (data !== undefined) {
      body.data = data;
    }
    return res.status(status).json(body);
  }

  static error(
    res: Response,
    message: string,
    status: number,
    error?: string
  ): Response<ErrorBody> {
    const body: ErrorBody = { success: false, message };
    if (error !== undefined) {
      body.error = error;
    }
    return res.status(status).json(body);
  }
}
