import express from 'express';
import { uploadFile, confirmImport, downloadTemplate } from '../controllers/importController.js';
import authMiddleware from '../middlewares/authmiddleware.js';
import upload from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Upload and parse file
router.post('/upload', upload.single('file'), uploadFile);

// Confirm and import products
router.post('/confirm', confirmImport);

// Download sample template
router.get('/template', downloadTemplate);

export default router;
