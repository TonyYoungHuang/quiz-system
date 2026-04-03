const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

function includesCn(value, keyword) {
  return value.includes(keyword);
}

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

function normalizeType(rawType) {
  const value = String(rawType || '').trim().toUpperCase();

  if (value.includes('CASE') || includesCn(value, '材料')) return 'CASE';
  if (value.includes('MULTI') || includesCn(value, '多选')) return 'MULTI';
  if (value.includes('JUDGE') || includesCn(value, '判断')) return 'JUDGE';
  if (value.includes('BLANK') || includesCn(value, '填空')) return 'BLANK';
  if (
    value.includes('SHORT') ||
    value.includes('OPEN') ||
    value.includes('ESSAY') ||
    includesCn(value, '简答') ||
    includesCn(value, '问答') ||
    includesCn(value, '开放') ||
    includesCn(value, '论述')
  ) {
    return 'SHORT';
  }
  if (value.includes('CALC') || includesCn(value, '计算')) return 'CALC';

  return 'SINGLE';
}

function extractTextFromBlocks(blocks) {
  if (!Array.isArray(blocks) || !blocks.length) return '';

  const parts = [];
  blocks.forEach(block => {
    if (!block || typeof block !== 'object') return;

    if (block.type === 'text') {
      const text = block.content && typeof block.content === 'object'
        ? (block.content.zh || block.content.text || '')
        : String(block.content || '');
      if (text.trim()) parts.push(text.trim());
      return;
    }

    if (block.type === 'formula') {
      const latex = String(block.latex || '').trim();
      if (latex) parts.push(`[公式] ${latex}`);
      return;
    }

    if (block.type === 'table') {
      const rows = Array.isArray(block.rows) ? block.rows : [];
      rows.forEach(row => {
        if (Array.isArray(row) && row.length) {
          parts.push(row.map(cell => String(cell || '').trim()).join(' | '));
        }
      });
      return;
    }

    if (block.type === 'image') {
      const url = String(block.url || '').trim();
      const caption = String(block.caption || '').trim();
      const label = caption || url || '图片';
      parts.push(`[图片] ${label}`);
    }
  });

  return parts.join('\n').trim();
}

function normalizeBlocks(rawBlocks, fallbackText = '') {
  if (Array.isArray(rawBlocks) && rawBlocks.length > 0) {
    return rawBlocks
      .map(block => normalizeBlock(block))
      .filter(Boolean);
  }

  const text = String(fallbackText || '').trim();
  return text
    ? [{ type: 'text', content: { zh: text } }]
    : [];
}

function normalizeBlock(block) {
  if (!block) return null;

  if (typeof block === 'string') {
    const text = block.trim();
    return text ? { type: 'text', content: { zh: text } } : null;
  }

  const type = String(block.type || 'text').trim().toLowerCase();
  if (type === 'image') {
    const url = String(block.url || '').trim();
    if (!url) return null;
    return {
      type: 'image',
      url,
      caption: String(block.caption || '').trim()
    };
  }

  if (type === 'formula') {
    const latex = String(block.latex || '').trim();
    if (!latex) return null;
    return {
      type: 'formula',
      latex
    };
  }

  if (type === 'table') {
    const rows = Array.isArray(block.rows)
      ? block.rows.map(row => Array.isArray(row) ? row.map(cell => String(cell || '')) : [])
      : [];
    if (!rows.length) return null;
    return {
      type: 'table',
      rows
    };
  }

  const content = block.content && typeof block.content === 'object'
    ? block.content
    : { zh: block.content || block.text || block.value || '' };
  const text = String(content.zh || content.text || content.value || '').trim();
  return text
    ? { type: 'text', content: { zh: text } }
    : null;
}

function normalizeMedia(rawMedia) {
  if (!Array.isArray(rawMedia)) return [];

  return rawMedia
    .map(item => {
      if (!item) return null;
      if (typeof item === 'string') {
        const url = item.trim();
        return url ? { type: 'image', url } : null;
      }

      const type = String(item.type || 'image').trim().toLowerCase();
      const url = String(item.url || '').trim();
      if (!url) return null;
      return {
        type,
        url,
        caption: String(item.caption || '').trim()
      };
    })
    .filter(Boolean);
}

function normalizeOptionBlocks(rawContent, fallbackValue = '') {
  if (Array.isArray(rawContent) && rawContent.length > 0) {
    return normalizeBlocks(rawContent);
  }

  const text = String(fallbackValue || rawContent || '').trim();
  return text ? [{ type: 'text', content: { zh: text } }] : [];
}

function normalizeStructuredOptions(rawOptions) {
  return rawOptions
    .map((item, index) => {
      if (!item) return null;
      if (typeof item === 'string') {
        const value = item.trim();
        return value ? { key: OPTION_KEYS[index], value } : null;
      }

      const key = String(item.key || OPTION_KEYS[index] || '').trim().toUpperCase();
      if (!OPTION_KEYS.includes(key)) return null;
      const value = String(item.value || extractTextFromBlocks(item.content) || '').trim();
      const content = normalizeOptionBlocks(item.content, value);

      if (!value && !content.length) return null;

      return {
        key,
        value: value || extractTextFromBlocks(content),
        content
      };
    })
    .filter(Boolean);
}

function normalizeObjectOptions(rawOptions) {
  return OPTION_KEYS.reduce((acc, key) => {
    const rawValue = rawOptions[key];
    if (typeof rawValue === 'string' && rawValue.trim()) {
      acc[key] = rawValue.trim();
      return acc;
    }

    if (rawValue && typeof rawValue === 'object') {
      const value = String(rawValue.value || extractTextFromBlocks(rawValue.content) || '').trim();
      if (value) acc[key] = value;
    }
    return acc;
  }, {});
}

function normalizeOptions(rawOptions, type) {
  if (type === 'JUDGE') {
    return {
      A: '正确',
      B: '错误'
    };
  }

  if (['BLANK', 'SHORT', 'CALC', 'CASE'].includes(type)) {
    return {};
  }

  if (Array.isArray(rawOptions)) {
    return normalizeStructuredOptions(rawOptions);
  }

  let options = {};

  if (typeof rawOptions === 'string') {
    const text = rawOptions.trim();
    if (text) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          return normalizeStructuredOptions(parsed);
        }
        if (parsed && typeof parsed === 'object') {
          options = parsed;
        }
      } catch (error) {
        const parts = text.split(/[|,]/).map(item => item.trim()).filter(Boolean);
        parts.forEach((part, index) => {
          if (OPTION_KEYS[index]) {
            options[OPTION_KEYS[index]] = part;
          }
        });
      }
    }
  } else if (rawOptions && typeof rawOptions === 'object') {
    options = rawOptions;
  }

  return normalizeObjectOptions(options);
}

function getOptionMap(options) {
  if (Array.isArray(options)) {
    return options.reduce((acc, item) => {
      if (item && item.key) {
        acc[String(item.key).toUpperCase()] = item;
      }
      return acc;
    }, {});
  }

  if (options && typeof options === 'object') {
    return options;
  }

  return {};
}

function normalizeAnswer(type, rawAnswer) {
  const rawText = Array.isArray(rawAnswer)
    ? rawAnswer.join('|')
    : String(rawAnswer || '').trim();
  const upperText = rawText.toUpperCase();

  if (type === 'CASE') {
    return null;
  }

  if (!rawText) {
    throw new Error('答案不能为空');
  }

  if (type === 'MULTI') {
    const answers = (upperText.match(/[A-Z]/g) || [])
      .filter(char => OPTION_KEYS.includes(char))
      .filter((char, index, arr) => arr.indexOf(char) === index)
      .sort();

    if (!answers.length) {
      throw new Error('多选题答案格式无效');
    }

    return answers;
  }

  if (type === 'JUDGE') {
    if (['A', 'TRUE', 'T', '正确', '对'].includes(upperText)) return 'A';
    if (['B', 'FALSE', 'F', '错误', '错'].includes(upperText)) return 'B';
    throw new Error('判断题答案只支持 A/B 或 正确/错误');
  }

  if (type === 'BLANK') {
    const answers = rawText
      .split('|')
      .map(item => item.trim())
      .filter(Boolean);

    if (!answers.length) {
      throw new Error('填空题答案不能为空');
    }

    return answers;
  }

  if (type === 'SHORT' || type === 'CALC') {
    return rawText;
  }

  if (!OPTION_KEYS.includes(upperText)) {
    throw new Error('单选题答案格式无效');
  }

  return upperText;
}

function getQuestionTitle(payload) {
  return payload.content || extractTextFromBlocks(payload.stem) || '未命名题目';
}

function validateChoiceOptions(type, options, answer) {
  const optionMap = getOptionMap(options);
  const optionKeys = Object.keys(optionMap);

  if (optionKeys.length < 2) {
    throw new Error('选择题至少需要 2 个有效选项');
  }

  if (type === 'SINGLE' && !optionMap[answer]) {
    throw new Error('单选题答案未命中有效选项');
  }

  if (type === 'MULTI') {
    const invalidAnswer = answer.find(key => !optionMap[key]);
    if (invalidAnswer) {
      throw new Error(`多选题答案 ${invalidAnswer} 不存在于选项中`);
    }
  }
}

function buildQuestionPayload(question = {}, index, parentContext = {}) {
  const type = normalizeType(question.type);
  const stem = normalizeBlocks(question.stem, question.content);
  const analysis = normalizeBlocks(question.analysis, question.explanation);
  const content = String(question.content || extractTextFromBlocks(stem)).trim();
  const explanation = String(question.explanation || extractTextFromBlocks(analysis)).trim();
  const sortOrder = Number.isFinite(Number(question.sortOrder))
    ? parseInt(question.sortOrder, 10)
    : index;
  const lineNo = Number.isFinite(Number(question.lineNo))
    ? parseInt(question.lineNo, 10)
    : index + 1;

  if (!content && !stem.length) {
    throw new Error('题目内容不能为空');
  }

  const payload = {
    examId: question.examId || parentContext.examId || '',
    topicId: question.topicId || parentContext.topicId || '',
    paperId: question.paperId || parentContext.paperId || '',
    type,
    content,
    explanation,
    stem,
    analysis,
    media: normalizeMedia(question.media || question.images || []),
    sortOrder,
    lineNo,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  if (question.needsMediaReview === true) {
    payload.needsMediaReview = true;
    payload.mediaReviewReason = String(question.mediaReviewReason || '').trim() || '该题原始版本需要图片，请在后台手动补图。';
  }
  if (question.mediaPrompt) {
    payload.mediaPrompt = String(question.mediaPrompt).trim();
  }
  if (Number.isFinite(Number(question.sourcePage))) {
    payload.sourcePage = parseInt(question.sourcePage, 10);
  }
  if (Number.isFinite(Number(question.sourceQuestionNo))) {
    payload.sourceQuestionNo = parseInt(question.sourceQuestionNo, 10);
  }

  if (type === 'CASE') {
    const children = Array.isArray(question.children) ? question.children : [];
    if (!children.length) {
      throw new Error('材料题至少需要 1 个子题');
    }

    payload.children = children.map((child, childIndex) => buildQuestionPayload(child, childIndex, {
      examId: payload.examId,
      topicId: payload.topicId,
      paperId: payload.paperId
    }));

    return payload;
  }

  const options = normalizeOptions(question.options, type);
  const answer = normalizeAnswer(type, question.answer);

  payload.options = options;
  payload.answer = answer;

  if (!['BLANK', 'SHORT', 'CALC', 'JUDGE'].includes(type)) {
    validateChoiceOptions(type, options, answer);
  }

  return payload;
}

async function getDocById(collectionName, id) {
  if (!id) return null;

  try {
    const result = await db.collection(collectionName).doc(id).get();
    return result.data || null;
  } catch (error) {
    return null;
  }
}

async function removeQuestionsByExamId(examId, maxDelete = 20) {
  let deletedCount = 0;

  while (deletedCount < maxDelete) {
    const rest = maxDelete - deletedCount;
    const batch = await db.collection('questions')
      .where({ examId })
      .field({ _id: true })
      .limit(Math.min(20, rest))
      .get();

    if (!batch.data.length) break;

    for (const item of batch.data) {
      await db.collection('questions').doc(item._id).remove();
      deletedCount += 1;
    }
  }

  const countResult = await db.collection('questions').where({ examId }).count();
  const remainingCount = countResult.total || 0;

  return {
    deletedCount,
    remainingCount,
    hasMore: remainingCount > 0
  };
}

async function findExistingQuestion(question) {
  if (!question || !question.examId) return null;

  const hasSourceKey = Number.isFinite(Number(question.sourceSetIndex)) && Number.isFinite(Number(question.sourceQuestionNo));
  if (!hasSourceKey) return null;

  try {
    const result = await db.collection('questions')
      .where({
        examId: question.examId,
        sourceSetIndex: Number(question.sourceSetIndex),
        sourceQuestionNo: Number(question.sourceQuestionNo)
      })
      .limit(1)
      .get();

    return result.data && result.data.length ? result.data[0] : null;
  } catch (error) {
    return null;
  }
}

exports.main = async (event = {}) => {
  const examId = event.examId;
  const topicId = event.topicId || '';
  const paperId = event.paperId || '';
  const mode = event.mode === 'overwrite' ? 'overwrite' : 'append';
  const questions = Array.isArray(event.questions) ? event.questions : [];

  try {
    const auth = await validateAdminToken(event.token);
    if (!auth.valid) {
      return {
        success: false,
        message: auth.message
      };
    }

    if (!examId) {
      return {
        success: false,
        message: '未提供科目 ID'
      };
    }

    const examDoc = await getDocById('exams', examId);
    if (!examDoc) {
      return {
        success: false,
        message: '科目不存在'
      };
    }

    if (topicId) {
      const topicDoc = await getDocById('topics', topicId);
      if (!topicDoc || topicDoc.examId !== examId) {
        return {
          success: false,
          message: '专题不存在或不属于当前科目'
        };
      }
    }

    if (paperId) {
      const paperDoc = await getDocById('papers', paperId);
      if (!paperDoc || paperDoc.examId !== examId) {
        return {
          success: false,
          message: '试卷不存在或不属于当前科目'
        };
      }
    }

    if (!questions.length && mode === 'overwrite') {
      const clearResult = await removeQuestionsByExamId(examId, 20);
      return {
        success: true,
        message: clearResult.hasMore
          ? `已删除一批旧题：${clearResult.deletedCount} 条，剩余 ${clearResult.remainingCount} 条`
          : `已清空旧题：${clearResult.deletedCount} 条`,
        data: {
          totalCount: 0,
          successCount: 0,
          failCount: 0,
          deletedCount: clearResult.deletedCount,
          remainingCount: clearResult.remainingCount,
          hasMore: clearResult.hasMore,
          typeStats: {
            SINGLE: 0,
            MULTI: 0,
            JUDGE: 0,
            BLANK: 0,
            SHORT: 0,
            CALC: 0,
            CASE: 0
          },
          errors: []
        }
      };
    }

    if (!questions.length) {
      return {
        success: false,
        message: '没有可导入的题目数据'
      };
    }

    const normalizedQuestions = [];
    const errors = [];
    const typeStats = {
      SINGLE: 0,
      MULTI: 0,
      JUDGE: 0,
      BLANK: 0,
      SHORT: 0,
      CALC: 0,
      CASE: 0
    };

    questions.forEach((question, index) => {
      try {
        const normalized = buildQuestionPayload(question, index, {
          examId,
          topicId,
          paperId
        });
        normalized.examId = examId;
        normalized.topicId = topicId || '';
        normalized.paperId = paperId || '';
        normalizedQuestions.push(normalized);
        typeStats[normalized.type] = (typeStats[normalized.type] || 0) + 1;
      } catch (error) {
        errors.push({
          lineNo: Number.isFinite(Number(question.lineNo)) ? parseInt(question.lineNo, 10) : index + 1,
          question: String(question.content || extractTextFromBlocks(question.stem) || '').trim() || '未命名题目',
          error: error.message
        });
      }
    });

    if (!normalizedQuestions.length && mode === 'overwrite') {
      const deletedCount = await removeQuestionsByExamId(examId);
      return {
        success: true,
        message: `已清空旧题：${deletedCount} 条`,
        data: {
          totalCount: 0,
          successCount: 0,
          failCount: errors.length,
          deletedCount,
          typeStats,
          errors
        }
      };
    }

    if (!normalizedQuestions.length) {
      return {
        success: false,
        message: '所有题目均未通过校验，请修正后重试',
        data: {
          successCount: 0,
          failCount: errors.length,
          deletedCount: 0,
          typeStats,
          errors
        }
      };
    }

    let deletedCount = 0;
    if (mode === 'overwrite') {
      const clearResult = await removeQuestionsByExamId(examId, 20);
      deletedCount = clearResult.deletedCount;
    }

    let successCount = 0;
    let skippedCount = 0;
    const dbErrors = [];
    const batchSize = 1;

    for (let i = 0; i < normalizedQuestions.length; i += batchSize) {
      const batch = normalizedQuestions.slice(i, i + batchSize);
      const results = [];
      for (const question of batch) {
        try {
          const existing = await findExistingQuestion(question);
          if (existing) {
            results.push({ success: true, skipped: true, question, existingId: existing._id });
            continue;
          }

          await db.collection('questions').add({
            data: question
          });
          results.push({ success: true, question });
        } catch (error) {
          results.push({ success: false, question, error });
        }
      }

      results.forEach(item => {
        if (item.success) {
          if (item.skipped) {
            skippedCount += 1;
          } else {
            successCount += 1;
          }
          return;
        }

        dbErrors.push({
          lineNo: item.question.lineNo,
          question: getQuestionTitle(item.question),
          error: item.error.message
        });
      });
    }

    const mergedErrors = errors.concat(dbErrors);

    return {
      success: true,
      message: `导入完成：成功 ${successCount} 条，失败 ${mergedErrors.length} 条`,
      data: {
        totalCount: questions.length,
        successCount,
        skippedCount,
        failCount: mergedErrors.length,
        deletedCount,
        typeStats,
        errors: mergedErrors
      }
    };
  } catch (error) {
    console.error('[adminImportQuestions] error', error);
    return {
      success: false,
      message: '批量导入题目失败',
      error: error.message
    };
  }
};
