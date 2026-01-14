import { IsOptional, IsString } from 'class-validator';

/**
 * "Post" means: mark as posted/final.
 * Typically you only allow posting if all expected received (or your business rule allows partial posted).
 */
export class PostGrnDto {
  @IsOptional()
  @IsString()
  remarks?: string;
}
