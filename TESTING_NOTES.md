# Testing Notes - Quiz App LMS Features

## Pre-requisites

1. Run all SQL migrations in Supabase (004, 005, 006)
2. `npm install` in both backend and frontend
3. Backend: `npm run dev`
4. Frontend: `npm run dev`

## Verification Checklist

### 1. Quiz Timer & Auto-Submit

- [ ] Student opens quiz → timer starts (per-student countdown)
- [ ] Refresh page → timer resumes from correct remaining time
- [ ] Time runs out → quiz auto-submits
- [ ] After submit → cannot attempt again (redirect to result)

### 2. Leaderboard

- [ ] Admin: View leaderboard filtered by quiz
- [ ] Admin: View leaderboard filtered by class
- [ ] Student: View leaderboard for own class
- [ ] Podium shows top 3
- [ ] Export CSV works (admin)

### 3. Question Bank

- [ ] Admin: View question bank
- [ ] Import questions from Excel/CSV to bank
- [ ] Clone question from bank to quiz (select quiz, click "Add to quiz")

### 4. Analytics

- [ ] Student: See accuracy and progress chart
- [ ] Admin: See topic performance and overall accuracy

### 5. Import/Export

- [ ] Admin Question Manage: Import questions via Excel/CSV
- [ ] Admin Question Manage: Export quiz (questions + answers) as XLSX

### 6. Notifications

- [ ] Submit quiz → notification appears
- [ ] Publish quiz → students in class get "New quiz available"
- [ ] Mark as read
- [ ] Mark all read

### 7. PWA

- [ ] Build: `npm run build` in frontend
- [ ] Install prompt appears (or "Add to Home Screen")
- [ ] Offline: Shell loads from cache

## API Endpoints Added

- `POST /api/quizzes/:quizId/start` - Start attempt (student)
- `GET /api/quizzes/:quizId/attempt` - Get attempt (student)
- `GET /api/leaderboard?quizId=&class=` - Leaderboard
- `GET /api/leaderboard/export` - Export CSV (admin)
- `GET/POST /api/bank` - Question bank
- `POST /api/bank/:id/clone` - Clone to quiz
- `GET /api/notifications` - List notifications
- `PATCH /api/notifications/:id/read` - Mark read
- `PATCH /api/notifications/read-all` - Mark all read
- `POST /api/import-export/questions` - Import (admin)
- `GET /api/import-export/quiz/:quizId` - Export quiz (admin)
- `GET /api/analytics/student` - Student analytics
- `GET /api/analytics/admin` - Admin analytics
