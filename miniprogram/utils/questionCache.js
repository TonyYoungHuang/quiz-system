const CACHE_PREFIX = 'question_cache_v1';
const DEFAULT_TTL = 5 * 60 * 1000;

function buildKey(params = {}) {
  const examId = params.examId || '';
  const topicId = params.topicId || '';
  const paperId = params.paperId || '';
  const type = params.type || '';
  return `${CACHE_PREFIX}_${examId}_${topicId}_${paperId}_${type}`;
}

function getCache(params = {}, ttl = DEFAULT_TTL) {
  try {
    const key = buildKey(params);
    const cached = wx.getStorageSync(key);
    if (!cached || !cached.updatedAt || !Array.isArray(cached.data)) return null;
    if (Date.now() - cached.updatedAt > ttl) return null;
    return cached.data;
  } catch (error) {
    console.error('[questionCache] getCache error', error);
    return null;
  }
}

function setCache(params = {}, data = []) {
  try {
    const key = buildKey(params);
    wx.setStorageSync(key, {
      updatedAt: Date.now(),
      data
    });
    return true;
  } catch (error) {
    console.error('[questionCache] setCache error', error);
    return false;
  }
}

function clearCache(params = {}) {
  try {
    wx.removeStorageSync(buildKey(params));
  } catch (error) {
    console.error('[questionCache] clearCache error', error);
  }
}

module.exports = {
  getCache,
  setCache,
  clearCache
};
