export const getFriendlyErrorMessage = (error: unknown): string => {
  const code = typeof error === 'object' && error && 'code' in error
    ? String((error as { code?: unknown }).code)
    : '';
  const message = error instanceof Error ? error.message : String(error || '');
  const normalized = `${code} ${message}`.toLowerCase();

  if (normalized.includes('permission-denied') || normalized.includes('missing or insufficient permissions')) {
    return 'This section is protected. Please sign in again, or ask the school office to update your access.';
  }

  if (normalized.includes('admin firebase auth session could not be started') || normalized.includes('invalid-credential')) {
    return 'The admin account needs to be updated by the school office before you can sign in.';
  }

  if (normalized.includes('auth/') || normalized.includes('unauthenticated')) {
    return 'Your session has expired. Please sign in again to continue.';
  }

  if (normalized.includes('network') || normalized.includes('failed to fetch')) {
    return 'We could not connect right now. Please check your internet connection and try again.';
  }

  return 'Something went wrong. Please try again, or contact the school office if it continues.';
};
