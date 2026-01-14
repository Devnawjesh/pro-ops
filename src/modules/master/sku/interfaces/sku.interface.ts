// src/modules/master/sku/interfaces/sku.interface.ts
export interface AuthUser {
  userId: string;
  company_id: string;
  username?: string;
  // any other claims
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
