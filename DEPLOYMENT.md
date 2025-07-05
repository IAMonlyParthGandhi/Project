# Deployment Guide

This guide covers deploying the Todo App to various platforms.

## 🚀 Quick Deploy

### Option 1: Docker Compose (Recommended)

1. **Clone the repository:**

   ```bash
   git clone <your-repo-url>
   cd todo-app-mern
   ```

2. **Configure environment:**

   ```bash
   # Copy example environment files
   cp server/.env.example server/.env
   cp client/.env.example client/.env

   # Edit the .env files with your configuration
   ```

3. **Deploy with Docker:**

   ```bash
   docker-compose up -d
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - MongoDB: mongodb://localhost:27017

### Option 2: Manual Deployment

#### Backend Deployment

**Heroku:**

```bash
# Install Heroku CLI
heroku create your-todo-app-backend

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your_mongodb_connection_string
heroku config:set JWT_SECRET=your_jwt_secret
heroku config:set JWT_REFRESH_SECRET=your_refresh_secret
heroku config:set CLIENT_URL=https://your-frontend-domain.com

# Deploy
cd server
git init
heroku git:remote -a your-todo-app-backend
git add .
git commit -m "Deploy backend"
git push heroku main
```

**Railway:**

```bash
# Install Railway CLI
railway login
railway new

# Connect to GitHub repository
railway link

# Set environment variables in Railway dashboard
# Deploy automatically triggers on push
```

**DigitalOcean App Platform:**

1. Connect your GitHub repository
2. Select the server folder as the source
3. Set environment variables in the dashboard
4. Deploy automatically

#### Frontend Deployment

**Vercel:**

```bash
# Install Vercel CLI
npm i -g vercel

cd client
vercel

# Set environment variables in Vercel dashboard:
# REACT_APP_API_URL=https://your-backend-url.com/api
# REACT_APP_SOCKET_URL=https://your-backend-url.com
```

**Netlify:**

1. Connect your GitHub repository
2. Set build command: `cd client && npm run build`
3. Set publish directory: `client/build`
4. Set environment variables in Netlify dashboard

## 🔧 Environment Configuration

### Production Environment Variables

**Backend (.env):**

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/todoapp
JWT_SECRET=your_super_secure_jwt_secret_32_chars_min
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_32_chars_min
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=https://your-frontend-domain.com
```

**Frontend (.env):**

```env
REACT_APP_API_URL=https://your-backend-domain.com/api
REACT_APP_SOCKET_URL=https://your-backend-domain.com
REACT_APP_NAME=TodoApp
```

## 🔒 Security Checklist

- [ ] Use strong, unique JWT secrets (32+ characters)
- [ ] Configure HTTPS for production
- [ ] Set up proper CORS origins
- [ ] Enable MongoDB authentication
- [ ] Use environment variables for all secrets
- [ ] Set up rate limiting
- [ ] Configure security headers
- [ ] Regular security updates

## 📊 Monitoring & Performance

### Recommended Monitoring Tools

**Backend Monitoring:**

- **Error Tracking:** Sentry, LogRocket
- **Performance:** New Relic, Datadog
- **Uptime:** Pingdom, UptimeRobot
- **Logs:** Papertrail, LogDNA

**Frontend Monitoring:**

- **Analytics:** Google Analytics, Mixpanel
- **Performance:** Lighthouse CI, WebPageTest
- **Error Tracking:** Sentry, Bugsnag
- **Real User Monitoring:** SpeedCurve

### Performance Optimizations

**Backend:**

- Enable compression middleware
- Use connection pooling for MongoDB
- Implement caching strategies
- Optimize database queries with indexes
- Set up CDN for static assets

**Frontend:**

- Code splitting with React.lazy()
- Image optimization and lazy loading
- Bundle analysis and optimization
- Progressive Web App features
- Service worker for offline support

## 🔄 CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"

      # Test Backend
      - name: Test Backend
        run: |
          cd server
          npm ci
          npm test

      # Test Frontend
      - name: Test Frontend
        run: |
          cd client
          npm ci
          npm test

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Heroku
        uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{secrets.HEROKU_API_KEY}}
          heroku_app_name: "your-todo-app-backend"
          heroku_email: "your-email@example.com"
          appdir: "server"

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID}}
          vercel-project-id: ${{ secrets.PROJECT_ID}}
          working-directory: client
```

## 🗄️ Database Management

### MongoDB Atlas Setup

1. **Create Account:** https://cloud.mongodb.com
2. **Create Cluster:** Choose your preferred region
3. **Configure Network Access:** Add your server IPs
4. **Create Database User:** Set username/password
5. **Get Connection String:** Use in MONGODB_URI

### Database Migrations

For schema changes, create migration scripts:

```javascript
// migrations/001-add-user-preferences.js
db.users.updateMany(
  { preferences: { $exists: false } },
  {
    $set: {
      preferences: {
        notifications: true,
        defaultPriority: "medium",
        defaultCategory: "general",
      },
    },
  }
);
```

## 📱 Mobile App (Future)

The codebase is structured to support React Native:

1. **Shared Logic:** Business logic in `/shared`
2. **API Client:** Reusable across platforms
3. **Components:** Platform-specific implementations
4. **State Management:** Consistent across platforms

## 🔧 Troubleshooting

### Common Issues

**CORS Errors:**

- Check CLIENT_URL environment variable
- Verify frontend URL in CORS configuration

**MongoDB Connection:**

- Verify connection string format
- Check network access rules
- Ensure database user permissions

**Authentication Issues:**

- Verify JWT secrets are consistent
- Check token expiration times
- Ensure cookies are properly configured

**Build Errors:**

- Clear node_modules and reinstall
- Check Node.js version compatibility
- Verify environment variables

### Logs and Debugging

**Backend Logs:**

```bash
# Heroku
heroku logs --tail -a your-app-name

# Railway
railway logs

# Docker
docker logs todo-app-backend
```

**Frontend Debugging:**

- Use browser developer tools
- Check console for errors
- Verify API requests in Network tab
- Test on different devices/browsers

## 📞 Support

For deployment issues:

1. Check the troubleshooting section
2. Review platform-specific documentation
3. Create an issue in the repository
4. Contact the development team

---

Happy Deploying! 🚀
