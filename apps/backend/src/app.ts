import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import attendanceRoutes from './routes/attendance';
import userRoutes from "./routes/user.routes";

const app = express();

app.use(cors());
app.use(express.json());
app.use('/attendance', attendanceRoutes);
app.use("/api/users", userRoutes);



/** Health check – verify backend is up */
app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'pcm-backend' });
});

/** Mount routes here – e.g. app.use('/attendance', attendanceRoutes); */

/** 404 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});


/** Error handler – keep as last middleware */
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
