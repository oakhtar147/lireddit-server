import { Connection, EntityManager, IDatabaseDriver } from "@mikro-orm/core";
import { Request, Response } from "express";
import { Session } from "express-session";

export type MyContext = {
  em: EntityManager<any> & EntityManager<IDatabaseDriver<Connection>>;
  req: Request & { session: Session };
  res: Response;
};

export type FieldErrorType<T> = {
  field: T;
  message: string;
};
