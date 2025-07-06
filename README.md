# Todo App - Full Stack MERN Application

A modern, feature-rich todo list application built with the MERN stack (MongoDB, Express.js, React, Node.js) featuring real-time updates, authentication, and a beautiful Material-UI interface.

## 🚀 Features

### Frontend Features

- **Modern React with TypeScript** - Type-safe development
- **Material-UI Components** - Professional, responsive UI
- **Real-time Updates** - Socket.IO integration for live updates
- **Authentication & Authorization** - Secure user management
- **Form Validation** - React Hook Form with Yup validation
- **Responsive Design** - Mobile-first approach
- **Dark/Light Theme** - User preference support
- **Smooth Animations** - Framer Motion animations

### Backend Features

- **Express.js Server** - RESTful API with TypeScript support
- **MongoDB Database** - Mongoose ODM for data modeling
- **JWT Authentication** - Access and refresh token system
- **Real-time WebSocket** - Socket.IO for live updates
- **Security Middleware** - Rate limiting, CORS, Helmet
- **Error Handling** - Comprehensive error management
- **Input Validation** - Server-side validation and sanitization

### Todo Features

- ✅ Create, read, update, delete todos
- 🏷️ Categories and tags
- ⭐ Priority levels (High, Medium, Low)
- 📅 Due dates and reminders
- 📝 Subtasks support
- ⏱️ Time estimation and tracking
- 🔍 Search and filtering
- 📊 Statistics and analytics
- 📁 Archive functionality
- 💾 Data export/import
- 🔄 Drag and drop reordering

## 🛠️ Technology Stack

### Frontend

- **React 18** with TypeScript
- **Material-UI (MUI)** for UI components
- **React Router** for navigation
- **React Hook Form** for form management
- **Yup** for validation
- **Axios** for API requests
- **Socket.IO Client** for real-time features
- **Framer Motion** for animations
- **Date-fns** for date manipulation

### Backend

- **Node.js** with Express.js
- **TypeScript** for type safety
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Socket.IO** for real-time features
- **bcryptjs** for password hashing
- **Helmet** for security headers
- **CORS** for cross-origin requests
- **Rate limiting** for API protection

## 📦 Installation & Setup

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

### Backend Setup

1. **Navigate to server directory:**

   ```bash
   cd server
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Create a `.env` file in the server directory:

   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Database
   MONGODB_URI=mongodb://localhost:27017/todoapp

   # JWT Secrets (Change these in production!)
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_this_in_production
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d

   # Client URL
   CLIENT_URL=http://localhost:3000
   ```

4. **Start the server:**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to client directory:**

   ```bash
   cd client
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Create a `.env` file in the client directory:

   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_SOCKET_URL=http://localhost:5000
   ```

4. **Start the development server:**
   ```bash
   npm start
   ```

### Full Stack Development

For development, you can run both frontend and backend simultaneously:

1. **From the root directory, install dependencies for both:**

   ```bash
   # Install server dependencies
   cd server && npm install

   # Install client dependencies
   cd ../client && npm install
   ```

2. **Run both servers (from root directory):**

   ```bash
   # Terminal 1 - Backend
   cd server && npm run dev

   # Terminal 2 - Frontend
   cd client && npm start
   ```

## 🔧 Available Scripts

### Backend Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests

### Frontend Scripts

- `npm start` - Start development server (http://localhost:3000)
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token

### Todo Endpoints

- `GET /api/todos` - Get todos (with filters)
- `GET /api/todos/stats` - Get todo statistics
- `GET /api/todos/:id` - Get single todo
- `POST /api/todos` - Create new todo
- `PUT /api/todos/:id` - Update todo
- `DELETE /api/todos/:id` - Delete todo
- `PATCH /api/todos/:id/toggle` - Toggle todo completion
- `PATCH /api/todos/bulk-update` - Bulk update todos
- `GET /api/todos/export/data` - Export todos

### User Endpoints

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/change-password` - Change password
- `DELETE /api/users/account` - Delete account
- `GET /api/users/stats` - Get user statistics

## 🔐 Security Features

- **JWT Authentication** with access and refresh tokens
- **Password Hashing** using bcryptjs
- **Rate Limiting** to prevent API abuse
- **CORS Protection** for cross-origin requests
- **Input Validation** and sanitization
- **Secure Headers** with Helmet middleware
- **Environment Variables** for sensitive data

## 🔒 Security & Performance (Updated July 2025)

**Enterprise-Level Security Improvements:**

- ✅ **Zero Hardcoded Secrets** - Environment validation ensures proper configuration
- ✅ **Refresh Token Rotation** - Automatic token rotation prevents replay attacks
- ✅ **CSRF Protection** - Double-submit cookie pattern implementation
- ✅ **Comprehensive Input Validation** - Joi-based validation on all endpoints
- ✅ **Socket.IO Authentication** - Real-time connection security with token expiration handling
- ✅ **Race Condition Protection** - Transaction-based operations for data integrity

**Performance Optimizations:**

- ⚡ **Database Index Optimization** - Removed duplicates, improved query performance
- ⚡ **Query Projection** - Field-specific queries reduce payload size
- ⚡ **Concurrent Operations** - Promise.all for parallel database operations
- ⚡ **Response Caching** - Smart caching headers for better performance
- ⚡ **API Versioning** - v1 API with backward compatibility

**Bug Fixes:**

- 🔧 **Deprecated API Removal** - Updated to modern MongoDB operations
- 🔧 **Error Handling** - Consistent try/catch blocks and error responses
- 🔧 **Response Standardization** - Uniform API response format across all endpoints

> See `IMPROVEMENTS_IMPLEMENTED.md` for detailed technical documentation.

## 🚀 Deployment

### Backend Deployment (Heroku/Railway/DigitalOcean)

1. Set environment variables on your hosting platform
2. Ensure MongoDB connection string is configured
3. Update CORS settings for production domain
4. Deploy using Git or Docker

### Frontend Deployment (Vercel/Netlify)

1. Update API URLs for production backend
2. Build the production bundle: `npm run build`
3. Deploy the `build` folder to your hosting platform

## 🎨 UI/UX Features

- **Responsive Design** - Works on desktop, tablet, and mobile
- **Dark/Light Theme** - User preference with system detection
- **Smooth Animations** - Framer Motion powered transitions
- **Material Design** - Modern, accessible interface
- **Real-time Updates** - Live synchronization across devices
- **Drag and Drop** - Intuitive todo reordering
- **Progressive Enhancement** - Works without JavaScript

## 🧪 Testing

The application includes comprehensive testing setup:

### Frontend Testing

- **React Testing Library** for component testing
- **Jest** for unit tests
- **User Event** for interaction testing

### Backend Testing

- **Jest** for unit and integration tests
- **Supertest** for API endpoint testing
- **MongoDB Memory Server** for database testing

Run tests:

```bash
# Frontend tests
cd client && npm test

# Backend tests
cd server && npm test
```

## 📈 Performance Optimizations

- **Code Splitting** with React.lazy()
- **Memoization** with React.memo() and useMemo()
- **Virtual Scrolling** for large todo lists
- **Image Optimization** and lazy loading
- **API Response Caching** with appropriate headers
- **Database Indexing** for optimized queries
- **Compression** middleware for smaller payloads

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/todo-app/issues) page
2. Create a new issue with detailed description
3. Include steps to reproduce the problem
4. Provide system information and error logs

## 🙏 Acknowledgments

- Material-UI team for the beautiful component library
- React team for the amazing framework
- MongoDB team for the robust database
- Express.js team for the minimalist web framework
- Socket.IO team for real-time communication
- All open-source contributors who made this project possible

## 🔮 Future Enhancements

- [ ] Mobile app with React Native
- [ ] Email notifications for due dates
- [ ] Calendar integration
- [ ] Team collaboration features
- [ ] File attachments support
- [ ] Advanced analytics dashboard
- [ ] API rate limiting per user
- [ ] Two-factor authentication
- [ ] Internationalization (i18n)
- [ ] Voice commands support
- [ ] AI-powered task suggestions
- [ ] Integration with third-party services (Google Calendar, Slack, etc.)

---

Made with ❤️ using the MERN stack
