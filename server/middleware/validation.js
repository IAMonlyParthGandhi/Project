/**
 * Request validation middleware using Joi
 * Provides comprehensive input validation for API endpoints
 */

const Joi = require("joi");
const { AppError } = require("./errorHandler");

/**
 * Validation schemas for different endpoints
 */
const schemas = {
  // Auth schemas
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  // Todo schemas
  createTodo: Joi.object({
    title: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().trim().max(1000).allow(""),
    priority: Joi.string().valid("low", "medium", "high").default("medium"),
    category: Joi.string().trim().max(50).default("general"),
    tags: Joi.array().items(Joi.string().trim().max(30)).max(10),
    dueDate: Joi.date().iso().greater("now").allow(null),
    reminderDate: Joi.date().iso().allow(null),
    estimatedTime: Joi.number().integer().min(1).max(1440).allow(null),
    subtasks: Joi.array()
      .items(
        Joi.object({
          title: Joi.string().trim().min(1).max(100).required(),
        })
      )
      .max(20),
  }),

  updateTodo: Joi.object({
    title: Joi.string().trim().min(1).max(200),
    description: Joi.string().trim().max(1000).allow(""),
    completed: Joi.boolean(),
    priority: Joi.string().valid("low", "medium", "high"),
    category: Joi.string().trim().max(50),
    tags: Joi.array().items(Joi.string().trim().max(30)).max(10),
    dueDate: Joi.date().iso().allow(null),
    reminderDate: Joi.date().iso().allow(null),
    estimatedTime: Joi.number().integer().min(1).max(1440).allow(null),
    actualTime: Joi.number().integer().min(0).allow(null),
    isArchived: Joi.boolean(),
    subtasks: Joi.array()
      .items(
        Joi.object({
          _id: Joi.string().optional(),
          title: Joi.string().trim().min(1).max(100).required(),
          completed: Joi.boolean().default(false),
        })
      )
      .max(20),
  }),

  // Query parameter schemas
  todoQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string()
      .valid(
        "createdAt",
        "updatedAt",
        "title",
        "dueDate",
        "priority",
        "completed"
      )
      .default("createdAt"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc"),
    category: Joi.string().max(50),
    priority: Joi.string().valid("low", "medium", "high", "all"),
    completed: Joi.string().valid("true", "false", "all"),
    search: Joi.string().max(100),
    tags: Joi.string().max(300), // Comma-separated tags
    isArchived: Joi.string().valid("true", "false").default("false"),
  }),

  // User profile update schema
  updateProfile: Joi.object({
    username: Joi.string().alphanum().min(3).max(30),
    email: Joi.string().email(),
    avatar: Joi.string().uri().allow(""),
    theme: Joi.string().valid("light", "dark"),
    preferences: Joi.object({
      notifications: Joi.boolean(),
      defaultPriority: Joi.string().valid("low", "medium", "high"),
      defaultCategory: Joi.string().max(50),
    }),
  }),

  // Password change schema
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).max(128).required(),
    confirmPassword: Joi.string().valid(Joi.ref("newPassword")).required(),
  }),
};

/**
 * Validation middleware factory
 * @param {string} schemaName - Name of the schema to use
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
const validate = (schemaName, property = "body") => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      return next(
        new AppError(`Validation schema '${schemaName}' not found`, 500)
      );
    }

    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all validation errors
      stripUnknown: true, // Remove unknown properties
      convert: true, // Convert types when possible
    });

    if (error) {
      const validationErrors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
        value: detail.context.value,
      }));

      return next(new AppError("Validation failed", 400, validationErrors));
    }

    // Replace the original data with the validated and sanitized data
    req[property] = value;
    next();
  };
};

/**
 * Custom validation middleware for specific requirements
 */
const customValidations = {
  // Validate that reminder date is before due date
  validateReminderDate: (req, res, next) => {
    const { dueDate, reminderDate } = req.body;

    if (reminderDate && dueDate && new Date(reminderDate) > new Date(dueDate)) {
      return next(
        new AppError("Reminder date must be before or equal to due date", 400)
      );
    }

    next();
  },

  // Validate ObjectId parameters
  validateObjectId: (paramName) => {
    return (req, res, next) => {
      const mongoose = require("mongoose");
      const id = req.params[paramName];

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError(`Invalid ${paramName} format`, 400));
      }

      next();
    };
  },
};

module.exports = {
  validate,
  schemas,
  customValidations,
};
