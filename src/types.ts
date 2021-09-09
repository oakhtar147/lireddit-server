import { Connection, EntityManager, IDatabaseDriver } from "@mikro-orm/core";
import { Request, Response } from "express";
import { Session } from "express-session";
import { Redis } from "ioredis";

export type MyContext = {
  em: EntityManager<any> & EntityManager<IDatabaseDriver<Connection>>;
  redis: Redis;
  req: Request & { session: Session };
  res: Response;
};

export type FieldErrorType<T> = {
  field: T;
  message: string;
};
