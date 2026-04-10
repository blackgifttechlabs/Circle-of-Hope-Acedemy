import { SystemSettings } from '../types';

export const REGISTRATION_FEE_OPTION = 'registration-fee';

const FALLBACK_TERMS = [
  { id: 'term-1', termName: 'Term 1' },
  { id: 'term-2', termName: 'Term 2' },
  { id: 'term-3', termName: 'Term 3' },
];

export const getPaymentOptions = (settings?: SystemSettings | null) => {
  const terms = (settings?.schoolCalendars?.length ? settings.schoolCalendars : FALLBACK_TERMS)
    .map((term) => ({ value: term.id, label: term.termName }));

  return [
    { value: REGISTRATION_FEE_OPTION, label: 'Registration Fee' },
    ...terms,
  ];
};

export const getPaymentOptionLabel = (value?: string, settings?: SystemSettings | null) => {
  if (!value) return '-';
  const match = getPaymentOptions(settings).find((option) => option.value === value);
  return match?.label || value;
};

export const isRegistrationFeeOption = (value?: string) => value === REGISTRATION_FEE_OPTION;
