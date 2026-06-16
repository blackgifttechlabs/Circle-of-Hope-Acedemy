const TOPIC_ABBREV: Record<string, string> = {
  'Listening and Responding': 'Listening & Responding',
  'Speaking and Communicating': 'Speaking & Communicating',
  'Reading and Viewing': 'Reading & Viewing',
};

const truncateLabel = (label: string, maxChars?: number) => {
  if (!maxChars || label.length <= maxChars) return label;
  const slice = label.substring(0, maxChars - 1);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > maxChars / 2 ? slice.substring(0, lastSpace) : slice;
  return `${cut}-`;
};

const truncateWithEllipsis = (label: string, maxChars: number) => {
  if (label.length <= maxChars) return label;
  const slice = label.substring(0, Math.max(1, maxChars - 1));
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > maxChars / 2 ? slice.substring(0, lastSpace) : slice;
  return `${cut}…`;
};

const truncateWords = (label: string, maxWords = 4) => {
  const words = label.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return label;
  return `${words.slice(0, maxWords).join(' ')}…`;
};

const capitalizeFirst = (value: string) => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export const getTopicLabelParts = (topic: string, maxChars?: number) => {
  const aliased = TOPIC_ABBREV[topic] ?? topic;
  const match = aliased.match(/^([^:]+):\s*(.*)$/);

  if (!match) {
    const full = capitalizeFirst(aliased.trim());
    return {
      prefix: '',
      suffix: full,
      full,
      display: truncateLabel(full, maxChars),
    };
  }

  const prefix = match[1].trim();
  const suffix = capitalizeFirst(match[2].trim());
  const full = suffix ? `${prefix}: ${suffix}` : prefix;

  return {
    prefix,
    suffix,
    full,
    display: truncateLabel(full, maxChars),
  };
};

export const getTopicHeaderHeight = (topics: string[], standardWorkflow: boolean) => {
  return standardWorkflow ? 128 : 148;
};

export const getTopicHeaderLines = (
  topic: string,
  maxCharsPerLine = 22,
  _maxLines = 1
) => {
  const { full } = getTopicLabelParts(topic);
  return [truncateWithEllipsis(truncateWords(full, 4), maxCharsPerLine)];
};
