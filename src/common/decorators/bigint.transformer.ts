import { ValueTransformer } from 'typeorm';

export const BigIntTransformer: ValueTransformer = {
  to: (value: any) => value,
  from: (value: any) => (value === null || value === undefined ? value : String(value)),
};
