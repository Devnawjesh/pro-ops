import { IsOptional, IsString } from 'class-validator';

export class BulkImportSchemeDto {
  @IsString()
  file_base64!: string;

  @IsOptional()
  @IsString()
  sheet_scheme?: string;

  @IsOptional()
  @IsString()
  sheet_rule?: string;
}
