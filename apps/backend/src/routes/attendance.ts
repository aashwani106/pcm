import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireStudent } from '../middleware/role';
import { markAttendanceForStudent } from '../service/attendance.service';
const router = Router();

router.post(
  '/mark',
  requireAuth,
  requireStudent,
  async (req: AuthRequest, res) => {

    try {
      const studentId = req.user!.id;
      console.log('Marking attendance for user:', studentId);
      const result = await markAttendanceForStudent(studentId);
      if ('error' in result) {
        if (result.error === 'ATTENDANCE_CLOSED') {
          return res.status(400).json({ error: 'Attendance window closed' });
        }
        if (result.error === 'ALREADY_MARKED') {
          return res.status(409).json({ error: 'Attendance already marked' });
        }
      }
      return res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
