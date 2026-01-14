// src/modules/master/sku/sku.permissions.ts
export const SKU_PERMS = {
  CREATE: 'master.sku.create',
  VIEW: 'master.sku.view',
  LIST: 'master.sku.list',
  UPDATE: 'master.sku.update',
  DELETE: 'master.sku.delete',
} as const;

export type SkuPermission = (typeof SKU_PERMS)[keyof typeof SKU_PERMS];
