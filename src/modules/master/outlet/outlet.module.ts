import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MdOutlet } from '../entities/md_outlet.entity';
import { MdOutletOrg } from '../entities/md_outlet_org.entity';
import { MdOutletDistributor } from '../entities/md_outlet_distributor.entity';

import { UserScope } from '../../users/entities/user-scope.entity';
import { Route } from '../../org/entities/route.entity';

import { OutletController } from './outlet.controller';
import { OutletService } from './outlet.service';
import { OrgHierarchy } from '../../org/entities/org-hierarchy.entity'; // adjust your real path
import { MdDistributor } from '../../distributors/entities/distributor.entity';     // adjust your real path


@Module({
  imports: [
    TypeOrmModule.forFeature([
      MdOutlet,
      MdOutletOrg,
      MdOutletDistributor,
      UserScope,
      Route,
      OrgHierarchy,
      MdDistributor,
    ]),
  ],
  controllers: [OutletController],
  providers: [OutletService],
  exports: [OutletService],
})
export class OutletModule {}
