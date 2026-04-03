const DEFAULT_RUNTIME = {
  cloudEnvId: 'cloud1-0g8twq2fde2fa6f0',
  enableHttpApi: false,
  httpApiBaseUrl: ''
};

function getStoredValue(key, fallback) {
  try {
    const value = wx.getStorageSync(key);
    return value === '' || value === undefined || value === null ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

function getRuntimeConfig() {
  const enableHttpApi = !!getStoredValue('enableHttpApi', DEFAULT_RUNTIME.enableHttpApi);
  const httpApiBaseUrl = String(getStoredValue('httpApiBaseUrl', DEFAULT_RUNTIME.httpApiBaseUrl) || '').trim();

  return {
    cloudEnvId: DEFAULT_RUNTIME.cloudEnvId,
    enableHttpApi,
    httpApiBaseUrl
  };
}

module.exports = {
  DEFAULT_RUNTIME,
  getRuntimeConfig
};
