const mongoose = require('mongoose');
const Todo = require('../models/Todo');

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

function normalizeTodoPayload(body, { requireTitle }) {
  const payload = {};

  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) {
      return { error: '할일 내용을 입력해 주세요.' };
    }
    if (title.length > 120) {
      return { error: '할일은 120자 이내로 입력해 주세요.' };
    }
    payload.title = title;
  } else if (requireTitle) {
    return { error: '할일 내용(title)은 필수입니다.' };
  }

  if (body.completed !== undefined) {
    if (typeof body.completed !== 'boolean') {
      return { error: 'completed는 boolean이어야 합니다.' };
    }
    payload.completed = body.completed;
  }

  if (body.order !== undefined) {
    const num = Number(body.order);
    if (Number.isNaN(num)) {
      return { error: 'order는 숫자여야 합니다.' };
    }
    payload.order = num;
  }

  return { payload };
}

exports.getTodos = async (req, res) => {
  try {
    // 연결이 끊어진 상태에서 쿼리하면 에러 남 → 개발 시 원인 파악용
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'DB 연결이 되어 있지 않습니다. (readyState: ' + mongoose.connection.readyState + ')',
      });
    }
    const todos = await Todo.find().sort({ order: 1, createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      data: todos,
    });
  } catch (err) {
    console.error('할일 목록 조회 오류:', err);
    const payload = {
      success: false,
      message: '서버 오류가 발생했습니다.',
    };
    // 개발 환경에서는 실제 에러 메시지 포함 → 500 원인 파악용
    if (process.env.NODE_ENV !== 'production') {
      payload.error = err.message || String(err);
    }
    return res.status(500).json(payload);
  }
};

exports.getTodoById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: '올바른 ID가 아닙니다.',
      });
    }

    const todo = await Todo.findById(id).lean();
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: '해당 할일을 찾을 수 없습니다.',
      });
    }

    return res.status(200).json({
      success: true,
      data: todo,
    });
  } catch (err) {
    console.error('할일 조회 오류:', err);
    const payload = { success: false, message: '서버 오류가 발생했습니다.' };
    if (process.env.NODE_ENV !== 'production') payload.error = err.message || String(err);
    return res.status(500).json(payload);
  }
};

exports.createTodo = async (req, res) => {
  try {
    const { payload, error } = normalizeTodoPayload(req.body || {}, { requireTitle: true });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    const todo = await Todo.create(payload);

    return res.status(201).json({
      success: true,
      data: todo,
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors)
        .map((e) => e.message)
        .join(' ');
      return res.status(400).json({
        success: false,
        message: message || '입력값이 올바르지 않습니다.',
      });
    }

    console.error('할일 생성 오류:', err);
    const payload = { success: false, message: '서버 오류가 발생했습니다.' };
    if (process.env.NODE_ENV !== 'production') payload.error = err.message || String(err);
    return res.status(500).json(payload);
  }
};

exports.updateTodo = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: '올바른 ID가 아닙니다.',
      });
    }

    const { payload, error } = normalizeTodoPayload(req.body || {}, { requireTitle: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        message: '수정할 항목을 적어도 하나 보내 주세요.',
      });
    }

    const todo = await Todo.findByIdAndUpdate(id, { $set: payload }, { new: true, runValidators: true }).lean();

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: '해당 할일을 찾을 수 없습니다.',
      });
    }

    return res.status(200).json({
      success: true,
      data: todo,
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors)
        .map((e) => e.message)
        .join(' ');
      return res.status(400).json({
        success: false,
        message: message || '입력값이 올바르지 않습니다.',
      });
    }

    console.error('할일 수정 오류:', err);
    const payload = { success: false, message: '서버 오류가 발생했습니다.' };
    if (process.env.NODE_ENV !== 'production') payload.error = err.message || String(err);
    return res.status(500).json(payload);
  }
};

exports.deleteTodo = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: '올바른 ID가 아닙니다.',
      });
    }

    const todo = await Todo.findByIdAndDelete(id);
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: '해당 할일을 찾을 수 없습니다.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { id: todo._id },
    });
  } catch (err) {
    console.error('할일 삭제 오류:', err);
    const payload = { success: false, message: '서버 오류가 발생했습니다.' };
    if (process.env.NODE_ENV !== 'production') payload.error = err.message || String(err);
    return res.status(500).json(payload);
  }
};

