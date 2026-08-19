export type TemplateValues = Record<string, string | number>;

const TOKEN_PATTERN = /\{\{(\w+)\}\}/g;


export function renderTemplate(template: string, values: TemplateValues): string {
  return template.replace(TOKEN_PATTERN, (match, token: string) => {
    if (!Object.hasOwn(values, token)) return match;
    return String(values[token]);
  });
}
