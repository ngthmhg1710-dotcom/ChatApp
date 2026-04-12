import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { cacheGet, cacheSet } from '../config/redis.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      let user = await cacheGet(`user:${decoded.id}`);

      if (!user) {
        user = await User.findById(decoded.id).select('-password');

        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'User not found'
          });
        }

        await cacheSet(`user:${decoded.id}`, user, 3600);
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role || 'user';

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
};
