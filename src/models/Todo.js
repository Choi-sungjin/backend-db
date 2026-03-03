const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, '할일 내용은 필수입니다.'],
      trim: true,
      maxlength: [120, '할일은 120자 이내로 입력해 주세요.'],
    },
    completed: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

todoSchema.index({ order: 1, createdAt: -1 });

module.exports = mongoose.model('Todo', todoSchema);

