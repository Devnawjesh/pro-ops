import { IsInt, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RoutesByWeekdayDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  day!: number;
}
