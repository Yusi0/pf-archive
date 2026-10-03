/**
 * Utility to parse and stringify Markdown YAML Frontmatter
 */

export function parseFrontmatter(fileContent) {
  if (!fileContent || typeof fileContent !== 'string') {
    return { data: {}, content: '' };
  }

  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const match = fileContent.match(frontmatterRegex);

  if (!match) {
    return { data: {}, content: fileContent };
  }

  const yamlBlock = match[1];
  const content = match[2];

  const data = {};
  const lines = yamlBlock.split(/\r?\n/);
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();
      
      // Strip outer quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      data[key] = value;
    }
  }

  return { data, content };
}

export function stringifyFrontmatter(data, content) {
  let yaml = '---\n';
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined && val !== null) {
      yaml += `${key}: ${val}\n`;
    }
  }
  yaml += '---\n\n';
  return yaml + (content || '');
}
