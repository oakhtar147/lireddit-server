import { MyContext } from 'src/types';
import argon2 from "argon2";
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";

import { User } from "./../entities/User";

@InputType()
class UsernamePasswordInput {
  @Field()
  username: string;

  @Field()
  password: string;
}

@ObjectType()
class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: Array<FieldError>;

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  async me(
    @Ctx() {req, em}: MyContext
  ): Promise<User | null> {   
    if (!req.session.userId) {
      return null;
    }

    try {
      const user = await em.findOne(User, { id: req.session.userId });
      return user;
    } catch {
      return null
    }
  }

  @Mutation(() => UserResponse, { nullable: true })
  async register(
    @Arg("input") { username, password }: UsernamePasswordInput,
    @Ctx() { req, em }: MyContext
  ): Promise<UserResponse> {
    if (username.length < 3) {
      return {
        errors: [
          {
            field: "invalid username",
            message: "username cannot be less than 5 characters",
          },
        ],
      };
    }

    if (password.length < 3) {
      return {
        errors: [
          {
            field: "invalid password",
            message: "password cannot be less than 5 characters",
          },
        ],
      };
    }

    const hashedPassword = await argon2.hash(password);

    const user = em.create(User, {
      username,
      password: hashedPassword,
    });

    try {
      await em.persistAndFlush(user);
    } catch (e) {
      if (e.code === "23505") {
        return {
          errors: [
            {
              field: "username",
              message: "Username already exists",
            },
          ],
        };
      }
    }

    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => UserResponse, { nullable: true })
  async login(
    @Arg("input") { username, password }: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(User, { username });

    if (!user) {
      return {
        errors: [
          {
            field: "username incorrect",
            message: "user not found",
          },
        ],
      };
    }

    const isValidPassword = await argon2.verify(user.password, password);

    if (!isValidPassword) {
      return {
        errors: [
          {
            field: "incorrect credentials",
            message: "password is incorrect",
          },
        ],
      };
    }

    req.session.userId = user.id;

    return { user };
  }
}
