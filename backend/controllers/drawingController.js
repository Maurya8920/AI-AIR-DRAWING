import mongoose from 'mongoose';
import Drawing from '../models/Drawing.js';

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Helper to calculate byte size of a base64 / data URL string.
 */
function getBase64ByteSize(base64String) {
  if (!base64String) return 0;
  // If data URI header exists (e.g. data:image/webp;base64,...), split it
  const base64Content = base64String.includes(',')
    ? base64String.split(',')[1]
    : base64String;
  const padding = (base64Content.match(/=+$/) || [''])[0].length;
  return (base64Content.length * 3) / 4 - padding;
}

/**
 * @desc    Create a new drawing
 * @route   POST /api/drawings
 * @access  Private
 */
const createDrawing = async (req, res, next) => {
  try {
    const { title, imageData, thumbnail, brushColor, brushSize } = req.body;

    if (!imageData) {
      res.status(400);
      throw new Error('Image data is required');
    }

    const imageSizeBytes = getBase64ByteSize(imageData);
    if (imageSizeBytes > MAX_IMAGE_SIZE_BYTES) {
      res.status(400);
      throw new Error('Image size exceeds 10MB limit. Please reduce canvas resolution.');
    }

    const drawing = await Drawing.create({
      user: req.user._id,
      title: title || 'Untitled Drawing',
      imageData,
      thumbnail: thumbnail || '',
      brushColor: brushColor || '#00f0ff',
      brushSize: brushSize || 5,
    });

    res.status(201).json({
      success: true,
      data: {
        _id: drawing._id,
        title: drawing.title,
        thumbnail: drawing.thumbnail,
        brushColor: drawing.brushColor,
        brushSize: drawing.brushSize,
        createdAt: drawing.createdAt,
      },
      message: 'Drawing saved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all drawings for the authenticated user (excludes full imageData)
 * @route   GET /api/drawings
 * @access  Private
 */
const getDrawings = async (req, res, next) => {
  try {
    const { search } = req.query;

    const query = { user: req.user._id };

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    // Exclude full imageData for fast list/gallery loading
    const drawings = await Drawing.find(query)
      .select('-imageData')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: drawings.length,
      data: drawings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single drawing by ID (includes full imageData)
 * @route   GET /api/drawings/:id
 * @access  Private
 */
const getDrawing = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error('Invalid drawing ID');
    }

    const drawing = await Drawing.findById(req.params.id);

    if (!drawing) {
      res.status(404);
      throw new Error('Drawing not found');
    }

    // Ownership check
    if (drawing.user.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to access this drawing');
    }

    res.json({
      success: true,
      data: drawing,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a drawing
 * @route   PUT /api/drawings/:id
 * @access  Private
 */
const updateDrawing = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error('Invalid drawing ID');
    }

    const drawing = await Drawing.findById(req.params.id);

    if (!drawing) {
      res.status(404);
      throw new Error('Drawing not found');
    }

    // Ownership check
    if (drawing.user.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to update this drawing');
    }

    const { title, brushColor, brushSize, imageData, thumbnail } = req.body;

    if (title !== undefined) drawing.title = title;
    if (brushColor !== undefined) drawing.brushColor = brushColor;
    if (brushSize !== undefined) drawing.brushSize = brushSize;
    if (thumbnail !== undefined) drawing.thumbnail = thumbnail;

    if (imageData !== undefined) {
      const imageSizeBytes = getBase64ByteSize(imageData);
      if (imageSizeBytes > MAX_IMAGE_SIZE_BYTES) {
        res.status(400);
        throw new Error('Image size exceeds 10MB limit');
      }
      drawing.imageData = imageData;
    }

    await drawing.save();

    res.json({
      success: true,
      data: {
        _id: drawing._id,
        title: drawing.title,
        thumbnail: drawing.thumbnail,
        brushColor: drawing.brushColor,
        brushSize: drawing.brushSize,
        updatedAt: drawing.updatedAt,
      },
      message: 'Drawing updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a drawing
 * @route   DELETE /api/drawings/:id
 * @access  Private
 */
const deleteDrawing = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error('Invalid drawing ID');
    }

    const drawing = await Drawing.findById(req.params.id);

    if (!drawing) {
      res.status(404);
      throw new Error('Drawing not found');
    }

    // Ownership check
    if (drawing.user.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to delete this drawing');
    }

    await drawing.deleteOne();

    res.json({
      success: true,
      message: 'Drawing deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export { createDrawing, getDrawings, getDrawing, updateDrawing, deleteDrawing };
