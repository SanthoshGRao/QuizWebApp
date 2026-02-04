# Quiz Scoring Fix - Verification Guide

## Problem Fixed
Students were getting incorrect scores because:
- Frontend displayed **shuffled** questions/options with remapped `correct_option` keys
- Backend compared answers against **unshuffled** `correct_option` from database
- This caused mismatches when options were shuffled

## Solution
Applied the **same shuffle** in `submitQuiz` before scoring, using the deterministic seed (userId + quizId).

## How to Verify

### 1. Manual Test Flow

1. **Create a quiz** with at least 3-4 questions
2. **Take the quiz** as a student:
   - Note which options you select
   - Answer some correctly, some incorrectly
   - Submit the quiz
3. **Check the score**:
   - Score should match visible correct answers
   - Result breakdown should show correct/wrong accurately
4. **Verify debug logs** (in backend console):
   ```
   [submitQuiz] Scoring debug: {
     userId: '...',
     quizId: '...',
     total: 4,
     score: 3,
     breakdown: [
       { questionId: '...', userAnswer: 'option2', correctOption: 'option2', isCorrect: true },
       ...
     ]
   }
   ```

### 2. Expected Behavior

- ✅ Score matches number of correct answers visible in UI
- ✅ Result breakdown shows correct answers marked correctly
- ✅ Percentage calculation is accurate
- ✅ Debug logs show `isCorrect: true` for answers that match shuffled `correctOption`

### 3. Edge Cases to Test

- Empty answers (auto-submit on timeout)
- All correct answers
- All incorrect answers
- Mixed correct/incorrect
- Questions with same option values (to ensure key comparison works)

### 4. After Verification

Once scoring is confirmed correct:
1. Remove debug logging from `submitQuiz` function
2. Remove this verification document (or archive it)

## Technical Details

- Shuffle is deterministic: same `userId + quizId` = same shuffle order
- Shuffle remaps `correct_option` to match new option positions
- Backend now applies shuffle before comparing, ensuring consistency
