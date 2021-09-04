import { Options } from "@mikro-orm/core";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";
import { SqlHighlighter } from "@mikro-orm/sql-highlighter";
import path from "path";

import { __prod__ } from "./constants";
import { Post } from "./entities/Post";
import { User } from "./entities/User";

export default {
  dbName: "lireddit",
  type: "postgresql",
  user: "postgres",
  password: "postgres",
  driver: PostgreSqlDriver,
  entities: [Post, User],
  debug: !__prod__,
  highlighter: new SqlHighlighter(),
  migrations: {
    path: path.join(__dirname, "./migrations"), // path to the folder with migrations
    pattern: /^[\w-]+\d+\.[tj]s$/, // regex pattern for the migration files
    disableForeignKeys: false,
  },
} as Options;
