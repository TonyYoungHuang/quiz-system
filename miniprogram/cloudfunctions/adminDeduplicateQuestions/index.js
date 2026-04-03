const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

async function validateAdminToken(token) {
  const tokenResult = await db.collection('admin_tokens')
    .where({ token })
    .get();

  if (!tokenResult.data.length) {
    return {
      valid: false,
      message: '登录状态无效，请重新登录'
    };
  }

  const tokenData = tokenResult.data[0];
  if (tokenData.expiresAt) {
    const expiresAt = new Date(tokenData.expiresAt).getTime();
    if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) {
      await db.collection('admin_tokens').doc(tokenData._id).remove();
      return {
        valid: false,
        message: '登录已过期，请重新登录'
      };
    }
  }

  return {
    valid: true,
    tokenData
  };
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAnswer(answer) {
  if (Array.isArray(answer)) {
    return answer.map(item => String(item || '').trim()).filter(Boolean).sort().join('|');
  }
  if (answer && typeof answer === 'object') {
    return JSON.stringify(answer);
  }
  return normalizeText(answer);
}

function normalizeOptions(options) {
  if (Array.isArray(options)) {
    return options
      .map(item => {
        if (!item) return '';
        const key = String(item.key || '').trim().toUpperCase();
        const value = normalizeText(item.value || '');
        return key && value ? `${key}:${value}` : '';
      })
      .filter(Boolean)
      .join('|');
  }

  if (!options || typeof options !== 'object') {
    return '';
  }

  return OPTION_KEYS
    .map(key => {
      const value = normalizeText(options[key] || '');
      return value ? `${key}:${value}` : '';
    })
    .filter(Boolean)
    .join('|');
}

function buildDuplicateKey(question) {
  const hasSourceKey = Number.isFinite(Number(question.sourceSetIndex)) && Number.isFinite(Number(question.sourceQuestionNo));
  if (hasSourceKey) {
    return `SRC|${question.sourceSetIndex}|${question.sourceQuestionNo}`;
  }

  return [
    'TXT',
    normalizeText(question.type),
    normalizeText(question.content),
    normalizeOptions(question.options),
    normalizeAnswer(question.answer)
  ].join('|');
}

function sortQuestionsForKeep(a, b) {
  const sortA = Number.isFinite(Number(a.sortOrder)) ? Number(a.sortOrder) : Number.MAX_SAFE_INTEGER;
  const sortB = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : Number.MAX_SAFE_INTEGER;
  if (sortA !== sortB) return sortA - sortB;

  const createdA = a.createdAt ? new Date(a.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
  const createdB = b.createdAt ? new Date(b.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
  if (createdA !== createdB) return createdA - createdB;

  return String(a._id || '').localeCompare(String(b._id || ''));
}

async function fetchAllQuestions(examId) {
  const all = [];
  const pageSize = 100;
  let page = 0;

  while (true) {
    const result = await db.collection('questions')
      .where({ examId })
      .field({
        _id: true,
        examId: true,
        type: true,
        content: true,
        options: true,
        answer: true,
        sortOrder: true,
        createdAt: true,
        sourceSetIndex: true,
        sourceQuestionNo: true
      })
      .orderBy('sortOrder', 'asc')
      .orderBy('createdAt', 'asc')
      .skip(page * pageSize)
      .limit(pageSize)
      .get();

    const list = result.data || [];
    all.push(...list);
    if (list.length < pageSize) break;
    page += 1;
  }

  return all;
}

exports.main = async (event = {}) => {
  try {
    const auth = await validateAdminToken(event.token);
    if (!auth.valid) {
      return {
        success: false,
        message: auth.message
      };
    }

    const examId = String(event.examId || '').trim();
    if (!examId) {
      return {
        success: false,
        message: '缺少 examId'
      };
    }

    const examResult = await db.collection('exams').doc(examId).get().catch(() => ({ data: null }));
    if (!examResult.data) {
      return {
        success: false,
        message: '科目不存在'
      };
    }

    const maxDelete = Math.max(1, Math.min(parseInt(event.maxDelete, 10) || 10, 20));
    const questions = await fetchAllQuestions(examId);
    const grouped = new Map();

    questions.forEach(question => {
      const key = buildDuplicateKey(question);
      const bucket = grouped.get(key) || [];
      bucket.push(question);
      grouped.set(key, bucket);
    });

    const duplicateGroups = [];
    grouped.forEach((bucket, key) => {
      if (bucket.length < 2) return;
      const sorted = bucket.slice().sort(sortQuestionsForKeep);
      duplicateGroups.push({
        key,
        keep: sorted[0],
        remove: sorted.slice(1)
      });
    });

    duplicateGroups.sort((a, b) => sortQuestionsForKeep(a.keep, b.keep));

    let deletedCount = 0;
    const deletedSamples = [];
    let remainingDuplicateCount = 0;
    let remainingDuplicateGroups = 0;

    for (const group of duplicateGroups) {
      if (group.remove.length > deletedCount) {
        remainingDuplicateGroups += 1;
      }

      for (const item of group.remove) {
        if (deletedCount < maxDelete) {
          await db.collection('questions').doc(item._id).remove();
          deletedCount += 1;
          if (deletedSamples.length < 10) {
            deletedSamples.push({
              questionId: item._id,
              sortOrder: item.sortOrder || '',
              content: normalizeText(item.content).slice(0, 60),
              keepQuestionId: group.keep._id
            });
          }
        } else {
          remainingDuplicateCount += 1;
        }
      }
    }

    return {
      success: true,
      message: deletedCount > 0 ? `已删除 ${deletedCount} 道重复题` : '未发现需要删除的重复题',
      data: {
        examId,
        examName: examResult.data.name || '',
        scannedCount: questions.length,
        duplicateGroupCount: duplicateGroups.length,
        duplicateQuestionCount: duplicateGroups.reduce((sum, group) => sum + group.remove.length, 0),
        deletedCount,
        remainingDuplicateCount,
        remainingDuplicateGroups,
        hasMore: remainingDuplicateCount > 0,
        deletedSamples
      }
    };
  } catch (error) {
    console.error('[adminDeduplicateQuestions] error', error);
    return {
      success: false,
      message: '重复题清理失败',
      error: error.message
    };
  }
};
