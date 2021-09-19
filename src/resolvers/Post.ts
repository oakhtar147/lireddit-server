import { MyContext } from "src/types";
import { sleep } from "../utils/sleep";
import { Arg, Ctx, Mutation, Query, Resolver } from "type-graphql";

import { Post } from "../entities/Post";

@Resolver()
export class PostResolver {
  @Query(() => [Post])
  async posts(): Promise<Post[]> {
    return await Post.find({});
  }

  @Query(() => Post, { nullable: true })
  async post(@Arg("id") id: number): Promise<Post | null> {
    const post = await Post.findOne(id);
    if (!post) return null;

    return post;
  }

  @Mutation(() => Post)
  async createPost(
    @Arg("title") title: string
  ): Promise<Post> {
    const post = await Post.create({ title }).save();
    return post;
  }

  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg("id") id: number,
    @Arg("title", { nullable: true }) title: string,
  ): Promise<Post | null> {
    const post = await Post.findOne(id);
    if (!post) {
      return null;
    }

    if (typeof title !== "undefined") {
      post.title = title;
      await Post.update(id, { title });
    }

    return post;
  }

  @Mutation(() => Boolean, { nullable: true })
  async deletePost(
    @Arg("id") id: number,
  ): Promise<Boolean> {
    try {
      await Post.delete(id);
    } catch {
      return false
    }
    
    return true;
  }
}
