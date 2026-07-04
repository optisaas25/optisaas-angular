import { ConfigService } from '@nestjs/config';

/**
 * Reads a required environment variable and throws instead of silently
 * falling back to a known/guessable default. A missing secret must fail
 * loudly at startup or first use, not open a backdoor.
 */
export function requireEnv(configService: ConfigService, key: string): string {
  const value = configService.get<string>(key);
  if (!value) {
    throw new Error(`FATAL: required environment variable ${key} is not set`);
  }
  return value;
}
