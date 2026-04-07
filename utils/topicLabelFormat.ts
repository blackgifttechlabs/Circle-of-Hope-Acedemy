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
  if (standardWorkflow) return 120;
  const longest = topics.reduce((max, topic) => {
    const { full } = getTopicLabelParts(topic);
    return Math.max(max, full.length);
  }, 0);
  return Math.max(120, Math.min(240, 92 + longest * 2.6));
};
