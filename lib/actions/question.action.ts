"use server";

import Question from "@/databases/question.modal";
import { connectToDatabase } from "./mongoose";
import Tag from "@/databases/tag.model";
import {
  CreateQuestionParams,
  GetQuestionByIdParams,
  GetQuestionsParams,
} from "./shared.types";
import User from "@/databases/user.model";
import { revalidatePath } from "next/cache";

export async function getQuestions(params: GetQuestionsParams) {
  try {
    await connectToDatabase();
    const questions = await Question.find({})
      .populate({
        path: "tags",
        model: Tag,
      })
      .populate({
        path: "author",
        model: User,
      })
      .sort({ createdAt: -1 });
    return { questions };
  } catch (error) {
    console.log("QUestion.action.ts: getQuestion: error: ", error);
  }
}
export async function createQuestion(params: CreateQuestionParams) {
  try {
    await connectToDatabase();
    const { title, content, tags, author, path } = params;
    // Create question

    const question = await Question.create({
      title,
      content,
      author,
    });
    const tagDocuments = [];

    //   where: {
    //     name: { contains: tags, mode: 'insensitive' }
    //   },
    //   update: {
    //     name: tags,
    //     question: { connect: { id: question?.id } }
    //   },
    //   create: {
    //     name: tags,
    //     question: { connect: { id: question?.id } }
    //   }
    // });
    for (const tag of tags) {
      const existingTag = await Tag.findOneAndUpdate(
        { name: { $regex: new RegExp(`^${tag}$`, "i") } },
        { $setOnInsert: { name: tag }, $push: { questions: question._id } },
        { upsert: true, new: true }
      );

      tagDocuments.push(existingTag._id);
    }
    await Question.findByIdAndUpdate(question._id, {
      $push: { tags: { $each: tagDocuments } },
    });
    revalidatePath(path);
  } catch (error) {
    console.log("question.action.ts: createQuestion: error: ", error);
  }
}

// get a specific question by id
export async function getQuestionById(params: GetQuestionByIdParams) {
  try {
    await connectToDatabase();
    const { questionId } = params;
    const question = await Question.findById(questionId)
      .populate({ path: "tags", model: Tag, select: "_id name" })
      .populate({
        path: "author",
        model: User,
        select: "_id clerkId name picture",
      });
    return question;
  } catch (error) {
    console.log("question.action.ts: getQuestionById: error: ", error);
  }
}
