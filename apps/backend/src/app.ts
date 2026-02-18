import express, { Request, Response } from 'express';
import cors from 'cors';
import attendanceRoutes from './routes/attendance.routes';
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';
import notificationRoutes from './routes/notification.routes';
import calendarRoutes from './routes/calendar.routes';
import classesRoutes from './routes/classes.routes';
import { ApiResponse } from './utils/ApiResponse';
import { errorHandler } from './middleware/errorHandler.middleware';
import { generateLiveKitToken } from './services/livekit.service';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', async (_req: Request, res: Response) => {
  // Temporary local test hook for LiveKit token generation.
  if (process.env.LIVEKIT_TOKEN_DEBUG === 'true') {
    try {
      const token = await generateLiveKitToken({
        userId: 'test-user',
        roomName: 'test-room',
        role: 'teacher',
      });
      console.log('LiveKit test token:', token);
    } catch (error) {
      console.log('LiveKit test token generation failed:', error);
    }
  }
  res.status(200).json(new ApiResponse(true, { service: 'pcm-backend' }, 'Service healthy', null));
});

app.use('/attendance', attendanceRoutes);
app.use('/api/users', userRoutes);
app.use('/admin', adminRoutes);
app.use('/notifications', notificationRoutes);
app.use('/calendar', calendarRoutes);
app.use('/classes', classesRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json(new ApiResponse(false, null, 'Route not found', null));
});

app.use(errorHandler);

export default app;
