import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/", (_req, res) => {
  res.status(501).json({ error: "Uploads not implemented" });
});

export default router;
