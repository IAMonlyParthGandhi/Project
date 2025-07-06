const express = require("express");
const Todo = require("../models/Todo");
const { asyncHandler, AppError } = require("../middleware/errorHandler");
const { validate, customValidations } = require("../middleware/validation");
const {
  successResponse,
  paginatedResponse,
} = require("../utils/responseFormatter");

const router = express.Router();

// Get all todos for authenticated user - optimized with better caching
router.get(
  "/",
  validate("todoQuery", "query"),
  asyncHandler(async (req, res) => {
    const {
      page,
      limit,
      sortBy,
      sortOrder,
      category,
      priority,
      completed,
      search,
      tags,
      isArchived,
    } = req.query;

    // Build filter object
    const filter = {
      userId: req.userId,
      isArchived: isArchived === "true",
    };

    if (category && category !== "all") {
      filter.category = category;
    }

    if (priority && priority !== "all") {
      filter.priority = priority;
    }

    if (completed !== undefined && completed !== "all") {
      filter.completed = completed === "true";
    }

    if (tags) {
      const tagArray = tags.split(",").map((tag) => tag.trim());
      filter.tags = { $in: tagArray };
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    try {
      // Use field projection for better performance
      const projection = {
        title: 1,
        description: 1,
        completed: 1,
        priority: 1,
        category: 1,
        tags: 1,
        dueDate: 1,
        reminderDate: 1,
        userId: 1,
        order: 1,
        subtasks: 1,
        completedAt: 1,
        estimatedTime: 1,
        actualTime: 1,
        isArchived: 1,
        createdAt: 1,
        updatedAt: 1,
      };

      // Use Promise.all for concurrent queries to improve performance
      const [todos, totalCount] = await Promise.all([
        Todo.find(filter, projection).sort(sort).skip(skip).limit(limit).lean(),
        Todo.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      const pagination = {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };

      // Set cache headers for better performance
      res.set("Cache-Control", "private, max-age=60"); // Cache for 1 minute

      res.json(
        paginatedResponse(todos, pagination, "Todos retrieved successfully")
      );
    } catch (error) {
      throw new AppError("Failed to fetch todos", 500);
    }
  })
);

// Get todo statistics
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const userId = req.userId;

    const [
      totalTodos,
      completedTodos,
      overdueTodos,
      todaysDueTodos,
      categoryStats,
      priorityStats,
    ] = await Promise.all([
      Todo.countDocuments({ userId, isArchived: false }),
      Todo.countDocuments({ userId, completed: true, isArchived: false }),
      Todo.countDocuments({
        userId,
        dueDate: { $lt: new Date() },
        completed: false,
        isArchived: false,
      }),
      Todo.countDocuments({
        userId,
        dueDate: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
        completed: false,
        isArchived: false,
      }),
      Todo.aggregate([
        { $match: { userId: req.user._id, isArchived: false } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Todo.aggregate([
        { $match: { userId: req.user._id, isArchived: false } },
        { $group: { _id: "$priority", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      totalTodos,
      completedTodos,
      pendingTodos: totalTodos - completedTodos,
      overdueTodos,
      todaysDueTodos,
      completionRate:
        totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0,
      categoryStats,
      priorityStats,
    });
  })
);

// Get single todo
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const todo = await Todo.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!todo) {
      throw new AppError("Todo not found", 404);
    }

    res.json(todo);
  })
);

// Create new todo
router.post(
  "/",
  validate("createTodo"),
  customValidations.validateReminderDate,
  asyncHandler(async (req, res) => {
    const { getNextOrderValue } = require("../utils/todoOrdering");

    const todoData = {
      ...req.body,
      userId: req.userId,
    };

    // Set order to be last if not provided
    if (!todoData.order) {
      todoData.order = await getNextOrderValue(req.userId, todoData.category);
    }

    const todo = new Todo(todoData);
    await todo.save();

    // Populate virtuals for response
    const populatedTodo = await Todo.findById(todo._id);

    res
      .status(201)
      .json(successResponse(populatedTodo, "Todo created successfully"));
  })
);

// Update todo
router.put(
  "/:id",
  customValidations.validateObjectId("id"),
  validate("updateTodo"),
  customValidations.validateReminderDate,
  asyncHandler(async (req, res) => {
    const todo = await Todo.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!todo) {
      throw new AppError("Todo not found", 404);
    }

    // Update fields safely
    Object.keys(req.body).forEach((key) => {
      if (key !== "userId" && key !== "_id") {
        todo[key] = req.body[key];
      }
    });

    await todo.save();

    // Populate virtuals for response
    const updatedTodo = await Todo.findById(todo._id);

    res.json(successResponse(updatedTodo, "Todo updated successfully"));
  })
);

// Toggle todo completion
router.patch(
  "/:id/toggle",
  asyncHandler(async (req, res) => {
    const todo = await Todo.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!todo) {
      throw new AppError("Todo not found", 404);
    }

    todo.completed = !todo.completed;
    await todo.save();

    res.json({
      message: `Todo ${todo.completed ? "completed" : "reopened"} successfully`,
      todo,
    });
  })
);

// Bulk update todos (for drag and drop reordering)
router.patch(
  "/bulk-update",
  asyncHandler(async (req, res) => {
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      throw new AppError("Updates must be an array", 400);
    }

    const bulkOps = updates.map((update) => ({
      updateOne: {
        filter: { _id: update.id, userId: req.userId },
        update: { $set: update.data },
      },
    }));

    await Todo.bulkWrite(bulkOps);

    res.json({ message: "Todos updated successfully" });
  })
);

// Archive/Unarchive todo
router.patch(
  "/:id/archive",
  asyncHandler(async (req, res) => {
    const { archive = true } = req.body;

    const todo = await Todo.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!todo) {
      throw new AppError("Todo not found", 404);
    }

    todo.isArchived = archive;
    await todo.save();

    res.json({
      message: `Todo ${archive ? "archived" : "unarchived"} successfully`,
      todo,
    });
  })
);

// Add subtask
router.post(
  "/:id/subtasks",
  asyncHandler(async (req, res) => {
    const { title } = req.body;

    if (!title) {
      throw new AppError("Subtask title is required", 400);
    }

    const todo = await Todo.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!todo) {
      throw new AppError("Todo not found", 404);
    }

    todo.subtasks.push({ title });
    await todo.save();

    res.status(201).json({
      message: "Subtask added successfully",
      todo,
    });
  })
);

// Update subtask
router.put(
  "/:id/subtasks/:subtaskId",
  asyncHandler(async (req, res) => {
    const { title, completed } = req.body;

    const todo = await Todo.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!todo) {
      throw new AppError("Todo not found", 404);
    }

    const subtask = todo.subtasks.id(req.params.subtaskId);
    if (!subtask) {
      throw new AppError("Subtask not found", 404);
    }

    if (title !== undefined) subtask.title = title;
    if (completed !== undefined) subtask.completed = completed;

    await todo.save();

    res.json({
      message: "Subtask updated successfully",
      todo,
    });
  })
);

// Delete subtask
router.delete(
  "/:id/subtasks/:subtaskId",
  asyncHandler(async (req, res) => {
    const todo = await Todo.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!todo) {
      throw new AppError("Todo not found", 404);
    }

    const subtask = todo.subtasks.id(req.params.subtaskId);
    if (!subtask) {
      throw new AppError("Subtask not found", 404);
    }

    // Use pull() instead of deprecated remove()
    todo.subtasks.pull(req.params.subtaskId);
    await todo.save();

    res.json({
      message: "Subtask deleted successfully",
      todo,
    });
  })
);

// Delete todo
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const todo = await Todo.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!todo) {
      throw new AppError("Todo not found", 404);
    }

    res.json({ message: "Todo deleted successfully" });
  })
);

// Bulk delete todos
router.delete(
  "/",
  asyncHandler(async (req, res) => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError("Todo IDs array is required", 400);
    }

    const result = await Todo.deleteMany({
      _id: { $in: ids },
      userId: req.userId,
    });

    res.json({
      message: `${result.deletedCount} todo(s) deleted successfully`,
      deletedCount: result.deletedCount,
    });
  })
);

// Export todos
router.get(
  "/export/data",
  asyncHandler(async (req, res) => {
    const todos = await Todo.find({ userId: req.userId }).select("-userId");

    const exportData = {
      exportDate: new Date().toISOString(),
      user: req.user.username,
      todos: todos,
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=todos-export.json"
    );
    res.json(exportData);
  })
);

// Reorder todos with race condition protection
router.post(
  "/reorder",
  asyncHandler(async (req, res) => {
    const { todoIds } = req.body;

    if (!Array.isArray(todoIds) || todoIds.length === 0) {
      throw new AppError("todoIds array is required", 400);
    }

    const { reorderTodos } = require("../utils/todoOrdering");

    try {
      await reorderTodos(req.userId, todoIds);

      res.json(successResponse(null, "Todos reordered successfully"));
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Failed to reorder todos", 500);
    }
  })
);

// Move todo to specific position
router.patch(
  "/:id/position",
  customValidations.validateObjectId("id"),
  asyncHandler(async (req, res) => {
    const { position } = req.body;

    if (!position || !Number.isInteger(position) || position < 1) {
      throw new AppError("Valid position (integer >= 1) is required", 400);
    }

    const { moveTodoToPosition } = require("../utils/todoOrdering");

    try {
      await moveTodoToPosition(req.params.id, req.userId, position);

      res.json(successResponse(null, "Todo position updated successfully"));
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Failed to move todo", 500);
    }
  })
);

module.exports = router;
