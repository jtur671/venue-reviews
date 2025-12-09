import { describe, expect, it } from 'vitest';
import {
  createErrorMessage,
  formatError,
  isKnownError,
} from '@/lib/utils/errors';

describe('Error Utilities', () => {
  describe('createErrorMessage', () => {
    it('extracts message from Error object', () => {
      const error = new Error('Test error message');
      expect(createErrorMessage(error, 'Default')).toBe('Test error message');
    });

    it('uses default message when Error has no message', () => {
      const error = new Error('');
      expect(createErrorMessage(error, 'Default message')).toBe('Default message');
    });

    it('returns string errors as-is', () => {
      expect(createErrorMessage('String error', 'Default')).toBe('String error');
    });

    it('uses default for unknown error types', () => {
      expect(createErrorMessage({}, 'Default')).toBe('Default');
      expect(createErrorMessage(null, 'Default')).toBe('Default');
      expect(createErrorMessage(undefined, 'Default')).toBe('Default');
    });
  });

  describe('formatError', () => {
    it('formats Error objects', () => {
      const error = new Error('Test error');
      const result = formatError(error, 'Default');
      expect(result).toBe('Test error');
    });

    it('formats string errors', () => {
      const result = formatError('String error', 'Default');
      expect(result).toBe('String error');
    });

    it('uses default for unknown types', () => {
      const result = formatError({}, 'Default message');
      expect(result).toBe('Default message');
    });
  });

  describe('isKnownError', () => {
    it('returns true for error objects with message', () => {
      const error = { message: 'Test error' };
      expect(isKnownError(error)).toBe(true);
    });

    it('returns false for objects without message', () => {
      expect(isKnownError({})).toBe(false);
      expect(isKnownError({ code: '123' })).toBe(false);
    });

    it('returns false for non-objects', () => {
      expect(isKnownError('string')).toBe(false);
      expect(isKnownError(null)).toBe(false);
      expect(isKnownError(undefined)).toBe(false);
      expect(isKnownError(123)).toBe(false);
    });
  });
});
