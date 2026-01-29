// utils/util.js - 工具函数

/**
 * 格式化时间
 */
function formatTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/**
 * 防抖函数
 */
function debounce(fn, delay = 300) {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * 节流函数
 */
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

/**
 * 题型映射
 */
const questionTypeMap = {
  'SINGLE': '单选题',
  'MULTI': '多选题',
  'JUDGE': '判断题'
};

/**
 * 获取题型名称
 */
function getQuestionTypeName(type) {
  return questionTypeMap[type] || '未知题型';
}

/**
 * 获取题型颜色
 */
function getQuestionTypeColor(type) {
  const colorMap = {
    'SINGLE': '#4A90E2',
    'MULTI': '#FAAD14',
    'JUDGE': '#52C41A'
  };
  return colorMap[type] || '#999';
}

/**
 * 显示加载中
 */
function showLoading(title = '加载中...') {
  wx.showLoading({
    title,
    mask: true
  });
}

/**
 * 隐藏加载中
 */
function hideLoading() {
  wx.hideLoading();
}

/**
 * 显示成功提示
 */
function showSuccess(title, duration = 2000) {
  wx.showToast({
    title,
    icon: 'success',
    duration
  });
}

/**
 * 显示错误提示
 */
function showError(title, duration = 2000) {
  wx.showToast({
    title,
    icon: 'none',
    duration
  });
}

/**
 * 确认对话框
 */
function showConfirm(content, title = '提示') {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => {
        resolve(res.confirm);
      }
    });
  });
}

/**
 * 存储数据
 */
function setStorage(key, data) {
  try {
    wx.setStorageSync(key, data);
    return true;
  } catch (e) {
    console.error('存储数据失败:', e);
    return false;
  }
}

/**
 * 获取存储数据
 */
function getStorage(key) {
  try {
    return wx.getStorageSync(key);
  } catch (e) {
    console.error('获取存储数据失败:', e);
    return null;
  }
}

/**
 * 移除存储数据
 */
function removeStorage(key) {
  try {
    wx.removeStorageSync(key);
    return true;
  } catch (e) {
    console.error('移除存储数据失败:', e);
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
