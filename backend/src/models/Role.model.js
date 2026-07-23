import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: ['family', 'citizen', 'police', 'hospital', 'ngo', 'shelter', 'admin'],
    required: true,
    unique: true,
  },
  permissions: [{ type: String }], // e.g. 'case:create', 'match:approve', 'user:manage'
});

export default mongoose.model('Role', roleSchema);