import { Router, type IRouter } from "express";
import {
  CreateQuizBody,
  CreateQuizResponse,
  FinishQuizParams,
  FinishQuizResponse,
  GetQuizParams,
  GetQuizResponse,
  GetQuizResultParams,
  GetQuizResultResponse,
  ListQuizzesQueryParams,
  ListQuizzesResponse,
  RetryIncorrectParams,
  RetryIncorrectResponse,
  SubmitAnswerBody,
  SubmitAnswerParams,
  SubmitAnswerResponse,
} from "@workspace/api-zod";
import { parse } from "../lib/http-error";
import * as quizzes from "../services/qbank";

const router: IRouter = Router();

router.post("/", async (req, res) => {
  const body = parse(CreateQuizBody, req.body);
  const quiz = await quizzes.createQuiz(req.auth!.user.id, body);
  res.status(201).json(CreateQuizResponse.parse(quiz));
});

router.get("/", async (req, res) => {
  const query = parse(ListQuizzesQueryParams, req.query);
  res.json(ListQuizzesResponse.parse(await quizzes.listQuizzes(req.auth!.user.id, query)));
});

router.get("/:id/result", async (req, res) => {
  const params = parse(GetQuizResultParams, req.params);
  res.json(GetQuizResultResponse.parse(await quizzes.getQuizResult(params.id, req.auth!.user.id)));
});

router.get("/:id", async (req, res) => {
  const params = parse(GetQuizParams, req.params);
  res.json(GetQuizResponse.parse(await quizzes.getQuiz(params.id, req.auth!.user.id)));
});

router.put("/:id/questions/:questionId/answer", async (req, res) => {
  const params = parse(SubmitAnswerParams, req.params);
  const body = parse(SubmitAnswerBody, req.body);
  res.json(SubmitAnswerResponse.parse(await quizzes.submitQuizAnswer(
    params.id,
    params.questionId,
    req.auth!.user.id,
    body,
  )));
});

router.post("/:id/finish", async (req, res) => {
  const params = parse(FinishQuizParams, req.params);
  res.json(FinishQuizResponse.parse(await quizzes.finishQuiz(params.id, req.auth!.user.id)));
});

router.post("/:id/retry-incorrect", async (req, res) => {
  const params = parse(RetryIncorrectParams, req.params);
  res.status(201).json(RetryIncorrectResponse.parse(
    await quizzes.retryIncorrect(params.id, req.auth!.user.id),
  ));
});

export default router;
