const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    completed: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    category: {
      type: String,
      required: true,
      default: "general",
      trim: true,
      maxlength: [50, "Category cannot exceed 50 characters"],
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [30, "Tag cannot exceed 30 characters"],
      },
    ],
    dueDate: {
      type: Date,
      validate: {
        validator: function (date) {
          return !date || date > new Date();
        },
        message: "Due date must be in the future",
      },
    },
    reminderDate: {
      type: Date,
      validate: {
        validator: function (date) {
          return !date || !this.dueDate || date <= this.dueDate;
        },
        message: "Reminder date must be before or equal to due date",
      },
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    attachments: [
      {
        filename: String,
        originalName: String,
        size: Number,
        mimetype: String,
        url: String,
      },
    ],
    subtasks: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
          maxlength: [100, "Subtask title cannot exceed 100 characters"],
        },
        completed: {
          type: Boolean,
          default: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    completedAt: Date,
    estimatedTime: {
      type: Number, // in minutes
      min: [1, "Estimated time must be at least 1 minute"],
      max: [1440, "Estimated time cannot exceed 24 hours (1440 minutes)"],
    },
    actualTime: {
      type: Number, // in minutes
      min: [0, "Actual time cannot be negative"],
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Update completedAt when todo is marked as completed
todoSchema.pre("save", function (next) {
  if (this.isModified("completed")) {
    if (this.completed && !this.completedAt) {
      this.completedAt = new Date();
    } else if (!this.completed) {
      this.completedAt = undefined;
    }
  }

  if (this.isModified("isArchived")) {
    if (this.isArchived && !this.archivedAt) {
      this.archivedAt = new Date();
    } else if (!this.isArchived) {
      this.archivedAt = undefined;
    }
  }

  next();
});

// Virtual for completion percentage based on subtasks
todoSchema.virtual("completionPercentage").get(function () {
  if (!this.subtasks || this.subtasks.length === 0) {
    return this.completed ? 100 : 0;
  }

  const completedSubtasks = this.subtasks.filter(
    (subtask) => subtask.completed
  ).length;
  return Math.round((completedSubtasks / this.subtasks.length) * 100);
});

// Virtual for overdue status
todoSchema.virtual("isOverdue").get(function () {
  return this.dueDate && new Date() > this.dueDate && !this.completed;
});

// Enhanced indexes for better performance
todoSchema.index({ userId: 1, createdAt: -1 });
todoSchema.index({ userId: 1, category: 1 });
todoSchema.index({ userId: 1, priority: 1 });
todoSchema.index({ userId: 1, completed: 1 });
todoSchema.index({ userId: 1, isArchived: 1 });
todoSchema.index({ userId: 1, dueDate: 1 });
todoSchema.index({ userId: 1, tags: 1 });
// Compound index for common filter combinations
todoSchema.index({ userId: 1, isArchived: 1, createdAt: -1 });
todoSchema.index({ userId: 1, completed: 1, priority: 1 });
// Text index for search functionality
todoSchema.index({ title: "text", description: "text", tags: "text" });
todoSchema.index({ userId: 1, completed: 1 });
todoSchema.index({ userId: 1, dueDate: 1 });
todoSchema.index({ userId: 1, isArchived: 1 });
todoSchema.index({ tags: 1 });

// Text search index for title and description
todoSchema.index({
  title: "text",
  description: "text",
  category: "text",
  tags: "text",
});

// Ensure virtual fields are serialized
todoSchema.set("toJSON", { virtuals: true });
todoSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Todo", todoSchema);
