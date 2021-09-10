import { MyContext } from "src/types";
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
import { FieldErrorType } from "../types";

import { User } from "./../entities/User";
import { COOKIE_NAME, FORGOT_PASSWORD_PREFIX } from "../constants";
import { FieldError } from "../utils/FieldError";
import { validateRegistration } from "../utils/registerValidation";
import { sendEmail } from "../utils/sendEmail";
import { v4 } from "uuid";
import { isNotNull } from "../utils/isNotNull";

export enum UserFields {
  EMAIL = "email",
  USERNAME = "username",
  PASSWORD = "password",
  NEW_PASSWORD = "newPassword",
}

/** SHARED TYPES */
@InputType()
class LoginInput {
  @Field()
  username: string;

  @Field()
  password: string;
}

@InputType()
export class RegisterInput extends LoginInput {
  @Field()
  email: string;
}

@InputType()
export class ResetPasswordInput {
  @Field()
  newPassword: string;

  @Field()
  token: string;
}

/** RESOLVERS */
@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: Array<FieldError>;

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Query(() => [User]) getUsers(@Ctx() { em }: MyContext) {
    return em.find(User, {});
  }

  @Query(() => User, { nullable: true })
  async me(@Ctx() { req, em }: MyContext): Promise<User | null> {
    if (!req.session) {
      return null;
    }

    try {
      const user = await em.findOne(User, { id: req.session.userId });
      return user;
    } catch {
      return null;
    }
  }

  @Mutation(() => UserResponse, { nullable: true })
  async register(
    @Arg("input") input: RegisterInput,
    @Ctx() { req, em }: MyContext
  ): Promise<UserResponse> {
    const errors = validateRegistration(input);

    // user has input invalid fields
    if (errors.length) {
      return { errors };
    }

    const userWithEmailExists = await em.findOne(User, { email: input.email });

    if (userWithEmailExists) {
      errors.push({
        field: UserFields.EMAIL,
        message: "An account with this email is already registered",
      });

      return { errors };
    }

    // we are sure the user can be created
    const hashedPassword = await argon2.hash(input.password);
    const user = em.create(User, {
      email: input.email,
      username: input.username,
      password: hashedPassword,
    });

    try {
      await em.persistAndFlush(user);
    } catch (e) {
      if (e.code === "23505") {
        errors.push({
          field: UserFields.USERNAME,
          message: "Username already exists",
        });

        return { errors };
      }
    }

    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => UserResponse, { nullable: true })
  async login(
    @Arg("input") { username, password }: LoginInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const errors: Array<FieldErrorType<UserFields>> = [];
    const user = await em.findOne(User, { username });

    if (!user) {
      errors.push({
        field: UserFields.USERNAME,
        message: "User does not exist",
      });

      return { errors };
    }

    const isValidPassword = await argon2.verify(user.password, password);

    if (!isValidPassword) {
      errors.push({
        field: UserFields.PASSWORD,
        message: "Password is incorrect",
      });

      return { errors };
    }

    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  async logout(@Ctx() { req, res }: MyContext) {
    return new Promise(resolve => {
      req.session.destroy(err => {
        if (err) {
          resolve(false);
          return;
        }

        res.clearCookie(COOKIE_NAME);
        resolve(true);
        return;
      });
    });
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { em, redis }: MyContext
  ): Promise<Boolean | null> {
    // find the user by email
    let user: User | null;
    try {
      user = await em.findOne(User, { email });
      if (!user) {
        return false;
      }
    } catch {
      return false;
    }

    // we found the user
    // now send them an email
    const token = v4();

    try {
      await redis.set(
        FORGOT_PASSWORD_PREFIX + token,
        user.id,
        "ex",
        1000 * 60 * 60 * 24 // 1 day
      );
    } catch {
      return false;
    }

    const html = `<a href='http://localhost:3000/change-password/${token}'>Change Password</a>`;

    try {
      await sendEmail(email, html);
    } catch (e) {
      return false;
    }

    return true;
  }

  @Mutation(() => UserResponse)
  async updatePassword(
    @Arg("options") { token, newPassword }: ResetPasswordInput,
    @Ctx() { req, em, redis }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length < 3) {
      return {
        errors: [
          {
            field: UserFields.NEW_PASSWORD,
            message: "Password cannot be less than 3 characters",
          },
        ],
      };
    }

    let userId: string | null = null;
    try {
      userId = await redis.get(FORGOT_PASSWORD_PREFIX + token);

      if (!userId) {
        return {
          errors: [
            {
              field: UserFields.NEW_PASSWORD,
              message: "Invalid or expired token.",
            },
          ],
        };
      }
    } catch (e) {}

    if (!isNotNull(userId)) {
      return {
        errors: [{
          field: UserFields.NEW_PASSWORD,
          message: 'No user found',
        }]
      }
    }

    const user = await em.findOne(User, { id: +userId! });

    if (!user) {
      return {
        errors: [
          {
            field: UserFields.NEW_PASSWORD,
            message: "Could not find user with your email.",
          },
        ],
      };
    }

    const newHashedPassword = await argon2.hash(newPassword);

    try {
      await em.nativeUpdate(
        User,
        { id: +userId },
        { password: newHashedPassword }
      );

      await em.flush();

    } catch (e) {
      return {
        errors: [
          {
            field: UserFields.NEW_PASSWORD,
            message: "Could not process your request.",
          },
        ],
      };
    }

    req.session.userId = user.id;

    await redis.del(
      FORGOT_PASSWORD_PREFIX + token,
    )

    return { user };
  }
}
