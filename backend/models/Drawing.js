import mongoose from 'mongoose';

const drawingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
      default: 'Untitled Drawing',
    },
    imageData: {
      type: String,
      required: [true, 'Image data is required'],
    },
    thumbnail: {
      type: String,
      default: '',
    },
    brushColor: {
      type: String,
      default: '#00f0ff',
    },
    brushSize: {
      type: Number,
      default: 5,
      min: 1,
      max: 50,
    },
  },
  {
    timestamps: true,
  }
);

const Drawing = mongoose.model('Drawing', drawingSchema);
export default Drawing;
