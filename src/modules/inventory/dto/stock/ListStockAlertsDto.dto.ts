export class ListStockAlertsDto {
  companyId!: string;         // required
  type!: 'LOW' | 'OVER';      // required
  page?: number;
  limit?: number;
  distributorId?: string;     // optional filter
  skuId?: string;             // optional filter
}
