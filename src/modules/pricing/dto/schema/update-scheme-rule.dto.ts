import { PartialType } from '@nestjs/mapped-types';
import { CreateSchemeRuleDto } from './create-scheme-rule.dto';

export class UpdateSchemeRuleDto extends PartialType(CreateSchemeRuleDto) {}
