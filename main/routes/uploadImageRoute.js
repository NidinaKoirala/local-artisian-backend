import crypto from 'crypto';
import { Router } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const cloudinarySecret = process.env.CLOUDINARY_API_SECRET;
const cloudinaryUploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

router.get('/signature', (req, res) => {
    const params = {
      timestamp: Math.round(Date.now() / 1000),
      upload_preset: 'artisian' // Should match your actual preset name
    };
  
    // Alphabetical sorting of parameters
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
  
    const signature = crypto
      .createHash('sha1')
      .update(sortedParams + cloudinarySecret)
      .digest('hex');
  
    res.json({
      ...params,
      signature,
      api_key: process.env.CLOUDINARY_API_KEY
    });
  });
  router.post('/signature', (req, res) => {
    const { publicId } = req.body;
    const timestamp = Math.round(Date.now() / 1000);
    const params = {
      public_id: publicId,
      timestamp,
    };
  
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
  
    const signature = crypto
      .createHash('sha1')
      .update(sortedParams + process.env.CLOUDINARY_API_SECRET)
      .digest('hex');
  
    res.json({ signature, timestamp });
  });
export default router;
