const RECORDS_PREFIX = 'practice_records';
const PROGRESS_PREFIX = 'practice_progress';
const FAVORITES_PREFIX = 'practice_favorites';

function getRecordKey(userId, examId) {
  return `${RECORDS_PREFIX}_${userId}_${examId}`;
}

function getProgressScopeSuffix(scope) {
  if (!scope || typeof scope !== 'object') return 'regular';
  if (scope.mode === 'wrong') return 'wrong';
  if (scope.mode === 'favorite') return 'favorite';
  if (scope.topicId) return `topic_${scope.topicId}`;
  if (scope.paperId) return `paper_${scope.paperId}`;
  return scope.mode || 'regular';
}

function getProgressKey(userId, examId, scope) {
  return `${PROGRESS_PREFIX}_${userId}_${examId}_${getProgressScopeSuffix(scope)}`;
}

function getFavoriteKey(userId, examId) {
  return `${FAVORITES_PREFIX}_${userId}_${examId}`;
}

function loadJson(key, fallback) {
  try {
    const value = wx.getStorageSync(key);
    if (!value) return fallback;
    return value;
  } catch (error) {
    console.error('[practice] loadJson error', key, error);
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    wx.setStorageSync(key, value);
    return true;
  } catch (error) {
    console.error('[practice] saveJson error', key, error);
    return false;
  }
}

function removeJson(key) {
  try {
    wx.removeStorageSync(key);
  } catch (error) {
    console.error('[practice] removeJson error', key, error);
  }
}

function cloneUserAnswer(answer) {
  if (Array.isArray(answer)) return answer.slice();
  if (answer && typeof answer === 'object') return { ...answer };
  return answer;
}

function getQuestionTitle(question = {}) {
  return String(question.content || '').trim() || '未命名题目';
}

function getExamRecords(userId, examId) {
  if (!userId || !examId) return {};
  return loadJson(getRecordKey(userId, examId), {});
}

function saveExamRecords(userId, examId, records) {
  if (!userId || !examId) return false;
  return saveJson(getRecordKey(userId, examId), records || {});
}

function getAnsweredQuestionIds(userId, examId) {
  const records = getExamRecords(userId, examId);
  return Object.keys(records).filter(id => records[id] && records[id].answeredAt);
}

function getPendingWrongQuestionIds(userId, examId) {
  const records = getExamRecords(userId, examId);
  return Object.keys(records).filter(id => records[id] && records[id].pendingWrong);
}

function upsertQuestionRecord(userId, examId, question, userAnswer, isCorrect) {
  const records = getExamRecords(userId, examId);
  const key = question._id;
  const current = records[key] || {
    questionId: key,
    examId,
    answerCount: 0,
    correctCount: 0,
    wrongCount: 0
  };

  current.type = question.type || '';
  current.content = getQuestionTitle(question);
  current.sortOrder = question.sortOrder || 0;
  current.lastUserAnswer = cloneUserAnswer(userAnswer);
  current.isCorrectLatest = !!isCorrect;
  current.answerCount += 1;
  current.updatedAt = Date.now();
  current.answeredAt = current.answeredAt || Date.now();

  if (isCorrect) {
    current.correctCount += 1;
    current.pendingWrong = false;
    current.lastCorrectAt = Date.now();
  } else {
    current.wrongCount += 1;
    current.pendingWrong = true;
    current.lastWrongAt = Date.now();
  }

  records[key] = current;
  saveExamRecords(userId, examId, records);
  return current;
}

function getExamProgress(userId, examId, scope) {
  if (!userId || !examId) return null;
  return loadJson(getProgressKey(userId, examId, scope), null);
}

function saveExamProgress(userId, examId, progress, scope) {
  if (!userId || !examId) return false;
  return saveJson(getProgressKey(userId, examId, scope), {
    ...(progress || {}),
    updatedAt: Date.now()
  });
}

function clearExamProgress(userId, examId, scope) {
  if (!userId || !examId) return;
  removeJson(getProgressKey(userId, examId, scope));
}

function getFavoriteQuestionMap(userId, examId) {
  if (!userId || !examId) return {};
  return loadJson(getFavoriteKey(userId, examId), {});
}

function saveFavoriteQuestionMap(userId, examId, favorites) {
  if (!userId || !examId) return false;
  return saveJson(getFavoriteKey(userId, examId), favorites || {});
}

function getFavoriteQuestionIds(userId, examId) {
  const favorites = getFavoriteQuestionMap(userId, examId);
  return Object.keys(favorites).filter(id => favorites[id] && favorites[id].questionId);
}

function getFavoriteQuestions(userId, examId) {
  const favorites = getFavoriteQuestionMap(userId, examId);
  return Object.keys(favorites)
    .map(key => favorites[key])
    .filter(Boolean)
    .sort((a, b) => {
      if ((a.sortOrder || 0) !== (b.sortOrder || 0)) {
        return (a.sortOrder || 0) - (b.sortOrder || 0);
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
}

function isFavoriteQuestion(userId, examId, questionId) {
  const favorites = getFavoriteQuestionMap(userId, examId);
  return !!favorites[questionId];
}

function toggleFavoriteQuestion(userId, examId, question) {
  if (!userId || !examId || !question || !question._id) {
    return { isFavorite: false, count: 0 };
  }

  const favorites = getFavoriteQuestionMap(userId, examId);
  const key = question._id;

  if (favorites[key]) {
    delete favorites[key];
  } else {
    favorites[key] = {
      questionId: key,
      examId,
      type: question.type || '',
      content: getQuestionTitle(question),
      sortOrder: question.sortOrder || 0,
      createdAt: Date.now()
    };
  }

  saveFavoriteQuestionMap(userId, examId, favorites);

  return {
    isFavorite: !!favorites[key],
    count: Object.keys(favorites).length
  };
}

function getFavoriteExamSummaries(userId, exams = []) {
  return (exams || []).map(exam => {
    const examId = exam && exam._id;
    const favoriteQuestions = examId ? getFavoriteQuestions(userId, examId) : [];
    const updatedAt = favoriteQuestions.reduce((latest, item) => {
      const current = item && item.createdAt;
      return current && current > latest ? current : latest;
    }, 0);

    return {
      ...exam,
      favoriteCount: favoriteQuestions.length,
      favoriteQuestions,
      updatedAt
    };
  }).filter(item => item.favoriteCount > 0);
}

function getWrongExamSummaries(userId, exams = []) {
  return (exams || []).map(exam => {
    const examId = exam && exam._id;
    const wrongCount = examId ? getPendingWrongQuestionIds(userId, examId).length : 0;
    const records = examId ? getExamRecords(userId, examId) : {};
    const updatedAt = Object.keys(records).reduce((latest, key) => {
      const current = records[key] && records[key].updatedAt;
      return current && current > latest ? current : latest;
    }, 0);

    return {
      ...exam,
      wrongCount,
      updatedAt
    };
  }).filter(item => item.wrongCount > 0);
}

module.exports = {
  getExamRecords,
  saveExamRecords,
  getAnsweredQuestionIds,
  getPendingWrongQuestionIds,
  upsertQuestionRecord,
  getExamProgress,
  saveExamProgress,
  clearExamProgress,
  getWrongExamSummaries,
  getFavoriteQuestionMap,
  saveFavoriteQuestionMap,
  getFavoriteQuestionIds,
  getFavoriteQuestions,
  isFavoriteQuestion,
  toggleFavoriteQuestion,
  getFavoriteExamSummaries
};
