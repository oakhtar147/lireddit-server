import "reflect-metadata";
import { MikroORM } from "@mikro-orm/core";
import { ApolloServer } from "apollo-server-express";
import connectRedis from "connect-redis";
import express from "express";
import session from "express-session";
import Redis from "ioredis";
import { buildSchema } from "type-graphql";
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";

import { COOKIE_NAME, __prod__ } from "./constants";
import typeOrmConfig from "./typeorm.config";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/Post";
import { UserResolver } from "./resolvers/User";
import cors, { CorsOptions } from "cors";
import { createConnection } from "typeorm";

import { MyContext } from "./types";

(async () => {
  const conn = await createConnection(typeOrmConfig);

  const RedisStore = connectRedis(session);
  const redisClient = new Redis();

  const app = express();

  const corsOptions = {
    origin: "http://localhost:3000",
    credentials: true,
  } as CorsOptions;

  app.use(cors(corsOptions));

  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redisClient,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365,
        httpOnly: true,
        secure: __prod__,
        sameSite: "lax",
      },
      saveUninitialized: false,
      secret: "some secret",
      resave: false,
    })
  );

  const apolloServer = new ApolloServer({
    debug: true,
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context({ req, res }): MyContext {
      return {
        req,
        res,
        redis: redisClient,
      };
    },
    plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
  });

  await apolloServer.start();

  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  app.listen(5000, () => {
    console.log("\x1b[35m", "\n🚀 http://localhost:5000/graphql");
  });
})();
