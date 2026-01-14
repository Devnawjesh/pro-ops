import { ValueTransformer } from 'typeorm';

// keep BIGINT as string (safe for JS)
export const BigIntTransformer: ValueTransformer = {
  to: (value: any) => value,
  from: (value: any) => (value === null || value === undefined ? value : String(value)),
};
