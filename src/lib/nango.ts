import { Nango } from '@nangohq/node';

// Create Nango client if secret key is available
export const nango = process.env.NANGO_SECRET_KEY 
  ? new Nango({ secretKey: process.env.NANGO_SECRET_KEY })
  : null;

export function replaceEmailVariables(
  template: string, 
  variables: { [key: string]: string }
): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || `[${key}]`);
  });
  return result;
}

// Helper to encode email for Gmail API
export function encodeEmailForGmail(emailContent: string): string {
  return Buffer.from(emailContent)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}