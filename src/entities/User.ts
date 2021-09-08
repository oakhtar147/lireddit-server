import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { Field, ObjectType } from "type-graphql";

@ObjectType()
@Entity()
export class User {
  @Field()
  @PrimaryKey()
  id!: number;

  @Field()
  @Property({ unique: true })
  email!: string;

  @Field()
  @Property({ unique: true })
  username!: string;

  @Property()
  password!: string;

  @Field()
  @Property({ type: "date" })
  createdAt: Date = new Date();

  @Field()
  @Property({ onUpdate: () => new Date(), type: "date" })
  updatedAt: Date = new Date();
}
