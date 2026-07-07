import { TermAssessmentRecord } from '../types';

export const isPrePrimaryOrSpecialNeedsRecord = (record: TermAssessmentRecord) => {
  const className = `${record.recordedClass || record.grade || ''}`.trim();
  return /Grade 0/i.test(className) || /^Level\s*[1-3]\b/i.test(className);
};
