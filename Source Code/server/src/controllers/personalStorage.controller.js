import fs from 'fs';
import path from 'path';
import PersonalStorage from '../models/personalStorage.model.js';

const writeBase64Image = (dataUrl, folder = 'personal') => {
  try {
    if (!dataUrl || !dataUrl.startsWith('data:')) return null;
    const matches = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
    if (!matches) return null;
    const ext = matches[2] === 'jpeg' ? 'jpg' : matches[2];
    const b64 = matches[3];
    const buffer = Buffer.from(b64, 'base64');
    const uploadsDir = path.join(process.cwd(), 'uploads', folder);
    fs.mkdirSync(uploadsDir, { recursive: true });
    const filename = `${Date.now()}-${Math.round(Math.random()*10000)}.${ext}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${folder}/${filename}`;
  } catch (err) {
    console.error('writeBase64Image error', err);
    return null;
  }
};

export const listItems = async (req, res) => {
  try {
    const items = await PersonalStorage.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createItem = async (req, res) => {
  try {
    const { title, text, image } = req.body;
    let imageUrl = null;
    if (image && image.startsWith('data:')) {
      imageUrl = writeBase64Image(image, 'personal');
    } else if (image) {
      // allow client to send already-hosted URLs
      imageUrl = image;
    }

    const item = await PersonalStorage.create({ owner: req.user._id, title, text, image: imageUrl });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getItem = async (req, res) => {
  try {
    const item = await PersonalStorage.findOne({ _id: req.params.id, owner: req.user._id });
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateItem = async (req, res) => {
  try {
    const { title, text } = req.body;
    const item = await PersonalStorage.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { title, text },
      { new: true, runValidators: true }
    );

    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const item = await PersonalStorage.findOne({ _id: req.params.id, owner: req.user._id });
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    // remove image file if hosted locally
    if (item.image && item.image.startsWith('/uploads/')) {
      // Ensure we don't treat a leading slash as absolute on Windows
      const relPath = item.image.replace(/^\/+/, '');
      const filePath = path.join(process.cwd(), relPath);
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Failed to unlink personal storage image', e);
      }
    }

    // Use deleteOne to avoid instance remove deprecation issues
    await PersonalStorage.deleteOne({ _id: req.params.id, owner: req.user._id });
    res.status(200).json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    console.error('personalStorage.deleteItem error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};
