import { IsBooleanString, IsNumberString, IsOptional, IsString } from 'class-validator';

export class EnvVars {
  @IsString() NODE_ENV: string;
  @IsOptional() @IsNumberString() PORT?: string;

  @IsString() DB_HOST: string;
  @IsNumberString() DB_PORT: string;
  @IsString() DB_USERNAME: string;
  @IsString() DB_PASSWORD: string;
  @IsString() DB_NAME: string;

  @IsOptional() @IsBooleanString() DB_SSL?: string;
}
