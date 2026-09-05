import { describe, it, expect, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import errorHandler from './error-handler.js';

function mockRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockReturnValue(res);

  return res;
}

const req = {};
const next = vi.fn();

describe('errorHandler', () => {
  it('maps Prisma unique constraint errors (P2002) to 409 CONFLICT', () => {
    const err = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`email`)',
      {
        code: 'P2002',
        clientVersion: '5.22.0',
      }
    );

    const res = mockRes();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      status: 409,
      error: 'CONFLICT',
      message: 'A record with the provided value already exists.',
    });
  });

  it('maps Prisma record-not-found errors (P2025) to 404 NOT_FOUND', () => {
    const err = new Prisma.PrismaClientKnownRequestError(
      'An operation failed because it depends on one or more records that were required but not found.',
      {
        code: 'P2025',
        clientVersion: '5.22.0',
      }
    );

    const res = mockRes();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: 404,
      error: 'NOT_FOUND',
      message: 'The requested resource was not found.',
    });
  });

  it('returns 500 for an unexpected Prisma error', () => {
    const err = new Prisma.PrismaClientKnownRequestError(
      'Unexpected database error',
      {
        code: 'P2000',
        clientVersion: '5.22.0',
      }
    );

    const res = mockRes();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: 500,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    });
  });

  it('preserves existing AppError handling', async () => {
    const { default: AppError } = await import('../errors/app-error.js');

    const err = new AppError(
      418,
      'TEST_ERROR',
      'This is a test error.'
    );

    const res = mockRes();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json).toHaveBeenCalledWith({
      status: 418,
      error: 'TEST_ERROR',
      message: 'This is a test error.',
    });
  });

  it('returns 500 for a generic unexpected error', () => {
    const err = new Error('Something went terribly wrong');
    const res = mockRes();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: 500,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    });
  });
});
