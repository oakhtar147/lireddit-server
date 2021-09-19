import { ConnectionOptions } from "typeorm";

import { __prod__ } from "./constants";
import { Post } from "./entities/Post";
import { User } from "./entities/User";

export default {
  type: "postgres",
  username: "postgres",
  password: "postgress",
  database: "lireddit2",
  entities: [Post, User],
} as ConnectionOptions;
