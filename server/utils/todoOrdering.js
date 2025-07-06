/**
 * Todo ordering utilities with race condition protection
 * Handles concurrent ordering operations safely
 */

const Todo = require("../models/Todo");
const { AppError } = require("../middleware/errorHandler");

/**
 * Safely reorder todos with race condition protection
 * @param {string} userId - User ID
 * @param {Array} todoIds - Array of todo IDs in desired order
 * @returns {Promise<void>}
 */
const reorderTodos = async (userId, todoIds) => {
  const session = await Todo.startSession();

  try {
    await session.withTransaction(async () => {
      // Validate that all todos belong to the user
      const todos = await Todo.find({
        _id: { $in: todoIds },
        userId,
      }).session(session);

      if (todos.length !== todoIds.length) {
        throw new AppError(
          "Some todos not found or do not belong to user",
          400
        );
      }

      // Update order using bulk operations
      const bulkOps = todoIds.map((todoId, index) => ({
        updateOne: {
          filter: { _id: todoId, userId },
          update: { order: index + 1 },
        },
      }));

      await Todo.bulkWrite(bulkOps, { session });
    });
  } finally {
    await session.endSession();
  }
};

/**
 * Get next order value for a new todo
 * @param {string} userId - User ID
 * @param {string} category - Todo category (optional)
 * @returns {Promise<number>} Next order value
 */
const getNextOrderValue = async (userId, category = null) => {
  const filter = { userId, isArchived: false };
  if (category) {
    filter.category = category;
  }

  const lastTodo = await Todo.findOne(filter)
    .sort({ order: -1 })
    .select("order")
    .lean();

  return lastTodo ? lastTodo.order + 1 : 1;
};

/**
 * Move todo to specific position
 * @param {string} todoId - Todo ID to move
 * @param {string} userId - User ID
 * @param {number} newPosition - New position (1-based)
 * @returns {Promise<void>}
 */
const moveTodoToPosition = async (todoId, userId, newPosition) => {
  const session = await Todo.startSession();

  try {
    await session.withTransaction(async () => {
      // Get the todo to move
      const todo = await Todo.findOne({ _id: todoId, userId }).session(session);
      if (!todo) {
        throw new AppError("Todo not found", 404);
      }

      const currentPosition = todo.order;

      if (currentPosition === newPosition) {
        return; // No change needed
      }

      // Get all todos in the same category
      const allTodos = await Todo.find({
        userId,
        isArchived: false,
        category: todo.category,
      })
        .sort({ order: 1 })
        .session(session);

      // Remove the todo from its current position
      const todosWithoutCurrent = allTodos.filter((t) => !t._id.equals(todoId));

      // Insert the todo at the new position
      todosWithoutCurrent.splice(newPosition - 1, 0, todo);

      // Update all orders
      const bulkOps = todosWithoutCurrent.map((t, index) => ({
        updateOne: {
          filter: { _id: t._id },
          update: { order: index + 1 },
        },
      }));

      if (bulkOps.length > 0) {
        await Todo.bulkWrite(bulkOps, { session });
      }
    });
  } finally {
    await session.endSession();
  }
};

/**
 * Normalize order values to prevent gaps
 * @param {string} userId - User ID
 * @param {string} category - Category to normalize (optional)
 * @returns {Promise<void>}
 */
const normalizeOrderValues = async (userId, category = null) => {
  const filter = { userId, isArchived: false };
  if (category) {
    filter.category = category;
  }

  const todos = await Todo.find(filter).sort({ order: 1, createdAt: 1 });

  const bulkOps = todos.map((todo, index) => ({
    updateOne: {
      filter: { _id: todo._id },
      update: { order: index + 1 },
    },
  }));

  if (bulkOps.length > 0) {
    await Todo.bulkWrite(bulkOps);
  }
};

module.exports = {
  reorderTodos,
  getNextOrderValue,
  moveTodoToPosition,
  normalizeOrderValues,
};
