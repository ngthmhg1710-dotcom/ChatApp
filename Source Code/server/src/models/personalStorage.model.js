import mongoose from 'mongoose';

const personalStorageSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    default: 'Không có tiêu đề'
  },
  text: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: null
  }
}, { timestamps: true });

const PersonalStorage = mongoose.model('PersonalStorage', personalStorageSchema);
export default PersonalStorage;
