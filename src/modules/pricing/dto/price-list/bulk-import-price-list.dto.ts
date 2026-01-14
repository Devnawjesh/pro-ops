import { IsOptional, IsString } from 'class-validator';

export class BulkImportPriceListDto {
  /**
   * Base64 Excel file content (xlsx)
   * If you use multipart upload, remove this and use @UploadedFile()
   */
  @IsString()
  file_base64!: string;

  /**
   * Optional: sheet names
   * - "price_list"
   * - "price_list_item"
   * - "price_list_scope"
   */
  @IsOptional()
  @IsString()
  sheet_price_list?: string;

  @IsOptional()
  @IsString()
  sheet_item?: string;

  @IsOptional()
  @IsString()
  sheet_scope?: string;
}
