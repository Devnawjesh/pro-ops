import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Company } from '../org/entities/company.entity';
import { OrgHierarchy } from '../org/entities/org-hierarchy.entity';
import { Route } from '../org/entities/route.entity';

import { CompanyController } from '../org/company/company.controller';
import { CompanyService } from '../org/company/company.service';

import { OrgHierarchyController } from './org-hierarchy/org-hierarchy.controller';
import { OrgHierarchyService } from './org-hierarchy/org-hierarchy.service';

import { RouteController } from './route/route.controller';
import { RouteService } from './route/route.service';

@Module({
  imports: [TypeOrmModule.forFeature([Company, OrgHierarchy, Route])],
  controllers: [CompanyController, OrgHierarchyController, RouteController],
  providers: [CompanyService, OrgHierarchyService, RouteService],
  exports: [CompanyService, OrgHierarchyService, RouteService],
})
export class OrgModule {}
