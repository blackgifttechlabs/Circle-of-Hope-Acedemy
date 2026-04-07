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
  const wrapWidth = standardWorkflow ? 18 : 15;
  const needsWrap = topics.some((topic) => getTopicHeaderLines(topic, wrapWidth).length > 1);
  return standardWorkflow ? (needsWrap ? 156 : 128) : (needsWrap ? 184 : 140);
};

export const getTopicHeaderLines = (
  topic: string,
  maxCharsPerLine = 18,
  maxLines = 2
) => {
  const { full } = getTopicLabelParts(topic);
  const words = full.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length <= maxCharsPerLine || currentLine === '') {
      currentLine = nextLine;
      return;
    }
    lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) lines.push(currentLine);
  if (lines.length <= maxLines) return lines;

  const collapsed = [...lines.slice(0, maxLines - 1)];
  collapsed.push(truncateWithEllipsis(lines.slice(maxLines - 1).join(' '), maxCharsPerLine));
  return collapsed;
};
