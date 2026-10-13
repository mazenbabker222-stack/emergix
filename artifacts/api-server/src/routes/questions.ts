import { Router, type IRouter } from "express";
import {
  ListDemoQuestionsResponse,
  ListDifficultyLevelsResponse,
  ListMyNotesQueryParams,
  ListMyNotesResponse,
  ListTopicsQueryParams,
  ListTopicsResponse,
  ReportQuestionBody,
  ReportQuestionParams,
  ReportQuestionResponse,
  SetQuestionFlagBody,
  SetQuestionFlagParams,
  SetQuestionFlagResponse,
  SetQuestionNoteBody,
  SetQuestionNoteParams,
  SetQuestionNoteResponse,
} from "@workspace/api-zod";
import { parse } from "../lib/http-error";
import { publicCache } from "../lib/http";
import * as catalog from "../services/question-catalog";

export const questionCatalogRouter: IRouter = Router();
export const questionActionsRouter: IRouter = Router();
export const myNotesRouter: IRouter = Router();

questionCatalogRouter.get("/topics", async (req, res) => {
  const query = parse(ListTopicsQueryParams, req.query);
  publicCache(res);
  res.json(ListTopicsResponse.parse(await catalog.listTopics(query.examId)));
});

questionCatalogRouter.get("/difficulty-levels", async (_req, res) => {
  publicCache(res);
  res.json(ListDifficultyLevelsResponse.parse(await catalog.listDifficultyLevels()));
});

questionCatalogRouter.get("/free-demo/questions", async (_req, res) => {
  publicCache(res);
  res.json(ListDemoQuestionsResponse.parse(await catalog.listDemoQuestions()));
});

questionActionsRouter.post("/:id/reports", async (req, res) => {
  const params = parse(ReportQuestionParams, req.params);
  const body = parse(ReportQuestionBody, req.body);
  res.status(201).json(ReportQuestionResponse.parse(
    await catalog.reportQuestion(req.auth!.user.id, params.id, body),
  ));
});

questionActionsRouter.put("/:id/flag", async (req, res) => {
  const params = parse(SetQuestionFlagParams, req.params);
  const body = parse(SetQuestionFlagBody, req.body);
  res.json(SetQuestionFlagResponse.parse(
    await catalog.setQuestionFlag(req.auth!.user.id, params.id, body.flagged),
  ));
});

questionActionsRouter.put("/:id/note", async (req, res) => {
  const params = parse(SetQuestionNoteParams, req.params);
  const body = parse(SetQuestionNoteBody, req.body);
  res.json(SetQuestionNoteResponse.parse(
    await catalog.setQuestionNote(req.auth!.user.id, params.id, body.body),
  ));
});

myNotesRouter.get("/notes", async (req, res) => {
  const query = parse(ListMyNotesQueryParams, req.query);
  res.json(ListMyNotesResponse.parse(
    await catalog.listMyQuestionNotes(req.auth!.user.id, query),
  ));
});
