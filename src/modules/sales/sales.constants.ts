// src/modules/sales/sales.constants.ts
export enum SoOrderStatus {
  DRAFT = 1,
  SUBMITTED = 2,
  APPROVED = 3,
  REJECTED = 4,
  INVOICED = 5,
  CANCELLED = 9,
}

export enum SoAllocationStatus {
  ACTIVE = 1,
  CANCELLED = 0,
}

export enum ScopeType {
  GLOBAL = 0,
  HIERARCHY = 1,
  ROUTE = 2,
  DISTRIBUTOR = 3,
}
