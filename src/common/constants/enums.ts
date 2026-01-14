export enum Status {
  INACTIVE = 0,
  ACTIVE = 1,
}

export enum OrgLevel {
  HOS = 1,
  DIV = 2,
  REGION = 3,
  AREA = 4,
  TERRITORY = 5,
}

export enum UserType {
  EMPLOYEE = 1,
  DISTRIBUTOR_USER = 2,
  SUB_DISTRIBUTOR_USER = 3,
  OUTLET_USER = 4,
}

export enum ScopeType {
  GLOBAL = 0,
  HIERARCHY = 1,
  ROUTE = 2,
  DISTRIBUTOR = 3,
}

export enum PermissionAction {
  VIEW = 'view',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
}

export enum DistributorType {
  PRIMARY = 1,
  SUB = 2,
}

export enum WarehouseOwnerType {
  COMPANY = 1,
  DISTRIBUTOR = 2,
  SUB_DISTRIBUTOR = 3,
}

export enum InvLotSourceDocType {
  GRN = 1,
  TRANSFER_IN = 2,
  RETURN_IN = 3,
  ADJ_IN = 4,
}

export enum InvTxnType {
  GRN_IN = 1,
  TRANSFER_OUT = 2,
  TRANSFER_IN = 3,
  ISSUE_BY_INVOICE = 4,
  ADJ_IN = 5,
  ADJ_OUT = 6,
}

export enum SchemeType {
  BXGY = 1,
  SLAB = 2,
  FLAT = 3,
  OVERRIDE = 4,
}

export enum RefDocType {
  GRN = 1,
  TRANSFER = 2,
  INVOICE = 3,
  ORDER = 4,
  ADJUSTMENT = 5,
}
export enum TransferStatus {
  DISPATCHED = 2,      // created+dispatched immediately
  PARTIAL = 4,         // some received, still pending
  RECEIVED = 3,        // fully received (all dispatched qty received)
  CANCELLED = 9,
}

export enum PriceListType {
  DEFAULT = 1,
  DISTRIBUTOR = 2,
  CHANNEL = 3,
  SPECIAL = 4,
}

export enum ErpEntityType {
  SKU = 1,
  OUTLET = 2,
  DISTRIBUTOR = 3,
  WAREHOUSE = 4,
}
