// MongoDB initialization script
db = db.getSiblingDB("todoapp");

// Create collections
db.createCollection("users");
db.createCollection("todos");

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ createdAt: -1 });

db.todos.createIndex({ userId: 1, createdAt: -1 });
db.todos.createIndex({ userId: 1, category: 1 });
db.todos.createIndex({ userId: 1, priority: 1 });
db.todos.createIndex({ userId: 1, completed: 1 });
db.todos.createIndex({ userId: 1, dueDate: 1 });
db.todos.createIndex({ userId: 1, isArchived: 1 });
db.todos.createIndex({ tags: 1 });

// Text search index for todos
db.todos.createIndex({
  title: "text",
  description: "text",
  category: "text",
  tags: "text",
});

print("Database initialized successfully!");
