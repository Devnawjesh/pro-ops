// src/modules/sales/dto/invoice.dto.ts
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateInvoiceDto {
  @IsString()
  @IsOptional()
  invoice_date?: string; // default today
}

export class BulkInvoiceDto {
  @IsArray()
  @IsNotEmpty()
  order_ids: string[];

  @IsString()
  @IsOptional()
  invoice_date?: string;
}
