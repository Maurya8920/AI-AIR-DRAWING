import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Protect routes — verify JWT from cookie, attach user to req.
 */
const protect = async (req, res, next) => {
  const token = req.cookies?.jwt;

  if (!token) {
    res.status(401);
    return next(new Error('Not authorized — no token'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      res.status(401);
      return next(new Error('Not authorized — user not found'));
    }

    next();
  } catch (error) {
    res.status(401);
    next(new Error('Not authorized — invalid token'));
  }
};

export { protect };
