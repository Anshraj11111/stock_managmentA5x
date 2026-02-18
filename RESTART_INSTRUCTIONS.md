# 🔄 Backend Restart Instructions

## Step 1: Stop Current Server
If your backend is running, press `Ctrl + C` in the terminal to stop it.

## Step 2: Restart Server

### Option A: Using npm (Recommended)
```bash
cd backend
npm run dev
```

### Option B: Using node directly
```bash
cd backend
node src/server.js
```

## Step 3: Verify Success

You should see these messages:
```
✅ Database connected successfully
🗄️ Database synced successfully with indexes
🚀 Server running on port 5000
```

## Step 4: Test the Application

1. Open your browser
2. Go to `http://localhost:3000` (or your frontend URL)
3. Login
4. Navigate between pages
5. Everything should be FAST now! ⚡

---

## Troubleshooting

### If you see "Database sync failed":
- Check your DATABASE_URL in `.env`
- Make sure your database server is running
- Try restarting the database server

### If indexes aren't created:
Run this command manually:
```bash
cd backend
node src/utils/syncDatabase.js
```

### If still slow:
1. Check Network tab in DevTools
2. Look for requests taking >1 second
3. Check server logs for errors
4. Verify database connection

---

## What Changed?

✅ Connection pooling added
✅ Database indexes created automatically
✅ N+1 queries fixed
✅ Report queries optimized
✅ Dashboard queries optimized

---

## Performance Targets

After restart, you should see:
- Login: <200ms ⚡
- Dashboard: <1s ⚡
- Products: <200ms ⚡
- Bills: <500ms ⚡
- Reports: <1s ⚡

---

**Ready? Restart your server now!** 🚀
