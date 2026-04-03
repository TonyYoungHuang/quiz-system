// utils/util.js
function formatTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function debounce(fn, delay = 300) {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function throttle(fn, delay = 300) {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

const questionTypeMap = {
  'SINGLE': '\u5355\u9009\u9898',
  'MULTI': '\u591a\u9009\u9898',
  'JUDGE': '\u5224\u65ad\u9898',
  'BLANK': '\u586b\u7a7a\u9898',
  'SHORT': '\u7b80\u7b54\u9898',
  'CASE': '\u6750\u6599\u9898',
  'CALC': '\u8ba1\u7b97\u9898'
};

function getQuestionTypeName(type) {
  return questionTypeMap[type] || '\u672a\u77e5\u9898\u578b';
}

function getQuestionTypeColor(type) {
  const colorMap = {
    'SINGLE': '#4A90E2',
    'MULTI': '#FAAD14',
    'JUDGE': '#52C41A',
    'BLANK': '#8B5CF6',
    'SHORT': '#14B8A6',
    'CASE': '#F97316',
    'CALC': '#0EA5E9'
  };
  return colorMap[type] || '#999';
}

function showLoading(title = '\u52a0\u8f7d\u4e2d...') {
  wx.showLoading({ title, mask: true });
}

function hideLoading() {
  wx.hideLoading();
}

function showSuccess(title, duration = 2000) {
  wx.showToast({ title, icon: 'success', duration });
}

function showError(title, duration = 2000) {
  wx.showToast({ title, icon: 'none', duration });
}

function showConfirm(content, title = '\u63d0\u793a') {
  return new Promise(resolve => {
    wx.showModal({
      title,
      content,
      success: res => resolve(res.confirm)
    });
  });
}

function setStorage(key, data) {
  try {
    wx.setStorageSync(key, data);
    return true;
  } catch (e) {
    console.error('setStorage error', e);
    return false;
  }
}

function getStorage(key) {
  try {
    return wx.getStorageSync(key);
  } catch (e) {
    console.error('getStorage error', e);
    return null;
  }
}

function removeStorage(key) {
  try {
    wx.removeStorageSync(key);
    return true;
  } catch (e) {
    console.error('removeStorage error', e);
    return false;
  }
}

module.exports = {
  formatTime,
  debounce,
  throttle,
  getQuestionTypeName,
  getQuestionTypeColor,
  showLoading,
  hideLoading,
  showSuccess,
  showError,
  showConfirm,
  setStorage,
  getStorage,
  removeStorage
};
