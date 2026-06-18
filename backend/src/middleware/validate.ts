import type { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";

export const validateBody = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid request body",
        errors: parsed.error.flatten().fieldErrors
      });
      return;
    }

    req.body = parsed.data;
    next();
  };
};

export const validateQuery = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid query params",
        errors: parsed.error.flatten().fieldErrors
      });
      return;
    }

    req.query = parsed.data;
    next();
  };
};
