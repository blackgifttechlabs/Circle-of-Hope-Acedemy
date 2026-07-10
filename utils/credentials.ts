export const isStrongStaffPassword = (value: string) => (
  value.trim().length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value)
);

export const STAFF_PASSWORD_REQUIREMENTS = 'Password must be at least 8 characters and include at least one letter and one number.';
