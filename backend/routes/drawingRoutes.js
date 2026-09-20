import express from 'express';
import {
  createDrawing,
  getDrawings,
  getDrawing,
  updateDrawing,
  deleteDrawing,
} from '../controllers/drawingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All drawing routes require authentication
router.use(protect);

router.route('/').post(createDrawing).get(getDrawings);
router.route('/:id').get(getDrawing).put(updateDrawing).delete(deleteDrawing);

export default router;
