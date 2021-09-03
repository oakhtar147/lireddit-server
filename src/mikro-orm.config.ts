import { Options } from '@mikro-orm/core';
import { Post } from './entities/Post';
import { __prod__ } from './constants';
import path from 'path';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';

export default {
  dbName: 'lireddit',
  type: 'postgresql',
  user: 'postgres',
  password: 'postgres',
  driver: PostgreSqlDriver,
  entities: [Post],
  debug: !__prod__,
  migrations: {
    path: path.join(__dirname, './migrations'), // path to the folder with migrations
    pattern: /^[\w-]+\d+\.[tj]s$/, // regex pattern for the migration files
    disableForeignKeys: false,
  },
} as Options;
