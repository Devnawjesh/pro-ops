import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Company } from '../../org/entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ListCompanyDto } from './dto/list-company.dto';

@Injectable()
export class CompanyService {
  constructor(@InjectRepository(Company) private readonly repo: Repository<Company>) {}

  async create(auth: any, dto: CreateCompanyDto) {
    const row: Company = this.repo.create({
    company_id: auth.company_id,
    code: dto.code.trim(),
    name: dto.name.trim(),
    legal_name: dto.legal_name ?? null,
    address: dto.address ?? null,
    created_by: auth.user_id ?? auth.sub ?? null,
  });

    try {
      return await this.repo.save(row);
    } catch (e: any) {
      // company_id+code unique
      if (e?.code === '23505') throw new ConflictException('Company code already exists');
      throw e;
    }
  }

  async list(auth: any, q: ListCompanyDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.repo
      .createQueryBuilder('c')
      .where('c.company_id = :company_id', { company_id: auth.company_id })
      .andWhere('c.deleted_at IS NULL');

    if (q.status !== undefined) qb.andWhere('c.status = :status', { status: q.status });

    if (q.q?.trim()) {
      qb.andWhere('(c.code ILIKE :q OR c.name ILIKE :q)', { q: `%${q.q.trim()}%` });
    }

    const total = await qb.getCount();

    const rows = await qb
      .select([
        'c.id AS id',
        'c.company_id AS company_id',
        'c.code AS code',
        'c.name AS name',
        'c.status AS status',
        'c.legal_name AS legal_name',
        'c.address AS address',
        'c.created_at AS created_at',
        'c.updated_at AS updated_at',
      ])
      .orderBy('c.id', 'DESC')
      .offset(skip)
      .limit(limit)
      .getRawMany();
    return { page, limit, total, rows, pages: Math.ceil(total / limit) };
  }

  async findOne(auth: any, id: string) {
    const row = await this.repo.findOne({
      where: { id, company_id: auth.company_id, deleted_at: null } as any,
    });
    if (!row) throw new NotFoundException('Company not found');
    return row;
  }

  async update(auth: any, id: string, dto: UpdateCompanyDto) {
    const row = await this.repo.findOne({
      where: { id, company_id: auth.company_id, deleted_at: null } as any,
    });
    if (!row) throw new NotFoundException('Company not found');

    if (
      dto.name === undefined &&
      dto.legal_name === undefined &&
      dto.address === undefined &&
      dto.status === undefined
    ) {
      throw new BadRequestException('Empty payload');
    }

    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.legal_name !== undefined) row.legal_name = dto.legal_name;
    if (dto.address !== undefined) row.address = dto.address;
    if (dto.status !== undefined) row.status = dto.status;

    row.updated_by = auth.user_id ?? auth.sub ?? null;

    return await this.repo.save(row);
  }

  async remove(auth: any, id: string) {
    const row = await this.repo.findOne({
      where: { id, company_id: auth.company_id, deleted_at: null } as any,
    });
    if (!row) throw new NotFoundException('Company not found');

    row.deleted_at = new Date();
    row.deleted_by = auth.user_id ?? auth.sub ?? null;
    return await this.repo.save(row);
  }
}
