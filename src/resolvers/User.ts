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
import { FieldErrorType } from '../types'

import { User } from "./../entities/User";
import { COOKIE_NAME } from '../constants';

enum Fields {
  USERNAME = 'username',
  PASSWORD = 'password',
}

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
    let errors: Array<FieldErrorType<Fields>> = [];

    if (username.length < 3) {
      errors.push({
        field: Fields.USERNAME,
        message: "Username cannot be less than 3 characters",
      });
    }

    if (password.length < 3) {
      errors.push({
        field: Fields.PASSWORD,
        message: "Password cannot be less than 3 characters",
      })
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
        errors.push({
            field: Fields.USERNAME,
            message: "Username already exists",
          });
        }
      }

    if (errors.length > 0) {
      return { errors };
    }

    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => UserResponse, { nullable: true })
  async login(
    @Arg("input") { username, password }: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const errors: Array<FieldErrorType<Fields>> = [];
    const user = await em.findOne(User, { username });

    if (!user) {
      errors.push({
        field: Fields.USERNAME,
        message: "User does not exist",
      });

      return { errors };
    }

    const isValidPassword = await argon2.verify(user.password, password);

    if (!isValidPassword) {
      errors.push({
        field: Fields.PASSWORD,
        message: "Password is incorrect",
      });

      return { errors };
    }

    req.session.userId = user.id;

    return { user };
  }
  
  @Mutation(() => Boolean)
  async logout(
    @Ctx() { req, res }: MyContext
  ) {
    return await new Promise((resolve) => {
      req.session.destroy((err) => {
        if (err) {
          resolve(false);
        }
        
        res.clearCookie(COOKIE_NAME)
        resolve(true);
      });
    });
  }
}
