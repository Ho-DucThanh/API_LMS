import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as process from 'node:process';
import 'dotenv/config';

const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  autoLoadEntities: true,
};

export default typeOrmConfig;
