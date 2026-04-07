const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const PAGE_SIZE = 100;
const EXECUTE_CONFIRM_TEXT = 'MOVE_TOPIC_TO_PAPER_ONCE';
const DEFAULT_MAPPINGS = [
  {
    topicTitle: '2025年6月真题',
    paperTitle: '2025年6月真题',
    paperYear: 2025,
    paperOrder: 202506,
    clearTopicId: true,
    createPaperIfMissing: true
  },
  {
    topicTitle: '2025年9月真题',
    paperTitle: '2025年9月真题',
    paperYear: 2025,
    paperOrder: 202509,
    clearTopicId: true,
    createPaperIfMissing: true
  }
];

async function validateAdminToken(token) {
  const tokenResult = await db.collection('admin_tokens')
    .where({ token })
    .get();

  if (!tokenResult.data.length) {
    return { valid: false, message: '登录状态无效，请重新登录' };
  }

  const tokenData = tokenResult.data[0];
  if (tokenData.expiresAt) {
    const expiresAt = new Date(tokenData.expiresAt).getTime();
    if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) {
      await db.collection('admin_tokens').doc(tokenData._id).remove();
      return { valid: false, message: '登录已过期，请重新登录' };
    }
  }

  return { valid: true, tokenData };
}

function trimString(value) {
  return String(value || '').trim();
}

function normalizeMappings(rawMappings) {
  const mappings = Array.isArray(rawMappings) && rawMappings.length
    ? rawMappings
    : DEFAULT_MAPPINGS;

  return mappings.map((item, index) => ({
    index: index + 1,
    topicId: trimString(item.topicId),
    topicTitle: trimString(item.topicTitle),
    paperId: trimString(item.paperId),
    paperTitle: trimString(item.paperTitle),
    paperYear: Number.isFinite(Number(item.paperYear)) ? parseInt(item.paperYear, 10) : undefined,
    paperOrder: Number.isFinite(Number(item.paperOrder)) ? parseInt(item.paperOrder, 10) : 0,
    clearTopicId: item.clearTopicId !== false,
    createPaperIfMissing: item.createPaperIfMissing !== false
  }));
}

async function getDocById(collectionName, docId) {
  if (!docId) return null;
  const result = await db.collection(collectionName).doc(docId).get().catch(() => ({ data: null }));
  return result.data || null;
}

async function findTopicDoc(examId, mapping) {
  if (mapping.topicId) {
    const topicDoc = await getDocById('topics', mapping.topicId);
    if (!topicDoc) {
      throw new Error(`未找到专题：${mapping.topicId}`);
    }
    if (topicDoc.examId !== examId) {
      throw new Error(`专题 ${mapping.topicId} 不属于当前科目`);
    }
    return topicDoc;
  }

  if (!mapping.topicTitle) {
    throw new Error('缺少 topicId 或 topicTitle');
  }

  const result = await db.collection('topics')
    .where({
      examId,
      name: mapping.topicTitle
    })
    .limit(2)
    .get();

  if (!result.data.length) {
    throw new Error(`未找到专题：${mapping.topicTitle}`);
  }
  if (result.data.length > 1) {
    throw new Error(`专题重名，请改用 topicId：${mapping.topicTitle}`);
  }

  return result.data[0];
}

async function createPaperDoc(examId, mapping) {
  if (!mapping.paperTitle) {
    throw new Error('缺少 paperTitle，无法自动创建试卷');
  }
  if (!Number.isInteger(mapping.paperYear)) {
    throw new Error(`试卷 ${mapping.paperTitle} 缺少 paperYear，无法自动创建`);
  }

  const now = new Date();
  const createResult = await db.collection('papers').add({
    data: {
      examId,
      title: mapping.paperTitle,
      year: mapping.paperYear,
      order: mapping.paperOrder || 0,
      isActive: true,
      createdAt: now,
      updatedAt: now
    }
  });

  return {
    _id: createResult._id,
    examId,
    title: mapping.paperTitle,
    year: mapping.paperYear,
    order: mapping.paperOrder || 0,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    _createdByMigration: true
  };
}

async function findPaperDoc(examId, mapping, dryRun) {
  if (mapping.paperId) {
    const paperDoc = await getDocById('papers', mapping.paperId);
    if (!paperDoc) {
      throw new Error(`未找到试卷：${mapping.paperId}`);
    }
    if (paperDoc.examId !== examId) {
      throw new Error(`试卷 ${mapping.paperId} 不属于当前科目`);
    }
    return paperDoc;
  }

  if (!mapping.paperTitle) {
    throw new Error('缺少 paperId 或 paperTitle');
  }

  const paperResult = await db.collection('papers')
    .where({
      examId,
      title: mapping.paperTitle
    })
    .limit(20)
    .get();

  const matched = Number.isInteger(mapping.paperYear)
    ? paperResult.data.filter(item => Number(item.year) === mapping.paperYear)
    : paperResult.data;

  if (matched.length === 1) {
    return matched[0];
  }

  if (matched.length > 1) {
    throw new Error(`试卷重名，请改用 paperId：${mapping.paperTitle}`);
  }

  if (!mapping.createPaperIfMissing) {
    throw new Error(`未找到试卷：${mapping.paperTitle}`);
  }

  if (dryRun) {
    return {
      _id: '',
      examId,
      title: mapping.paperTitle,
      year: mapping.paperYear || null,
      order: mapping.paperOrder || 0,
      isActive: true,
      _willCreateByMigration: true
    };
  }

  return createPaperDoc(examId, mapping);
}

async function previewQuestions(examId, topicId) {
  const countResult = await db.collection('questions')
    .where({ examId, topicId })
    .count();

  const sampleResult = await db.collection('questions')
    .where({ examId, topicId })
    .field({
      _id: true,
      content: true,
      sourceQuestionNo: true,
      sortOrder: true,
      paperId: true
    })
    .orderBy('sortOrder', 'asc')
    .limit(5)
    .get();

  return {
    total: countResult.total || 0,
    sample: (sampleResult.data || []).map(item => ({
      _id: item._id,
      sourceQuestionNo: item.sourceQuestionNo || null,
      sortOrder: item.sortOrder || null,
      paperId: item.paperId || '',
      contentPreview: trimString(item.content).slice(0, 40)
    }))
  };
}

async function moveQuestions(examId, topicDoc, paperDoc, clearTopicId) {
  let movedCount = 0;
  let batchCount = 0;

  while (true) {
    const batch = await db.collection('questions')
      .where({ examId, topicId: topicDoc._id })
      .field({ _id: true })
      .limit(PAGE_SIZE)
      .get();

    const questions = batch.data || [];
    if (!questions.length) {
      break;
    }

    batchCount += 1;
    for (const question of questions) {
      const updateData = {
        paperId: paperDoc._id,
        updatedAt: new Date()
      };
      if (clearTopicId) {
        updateData.topicId = '';
      }

      await db.collection('questions').doc(question._id).update({
        data: updateData
      });
      movedCount += 1;
    }
  }

  return { movedCount, batchCount };
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

    const examId = trimString(event.examId);
    const dryRun = event.dryRun !== false;
    const confirm = trimString(event.confirm);
    const mappings = normalizeMappings(event.mappings);

    if (!examId) {
      return {
        success: false,
        message: '请提供 examId'
      };
    }

    const examDoc = await getDocById('exams', examId);
    if (!examDoc) {
      return {
        success: false,
        message: '科目不存在'
      };
    }

    if (!dryRun && confirm !== EXECUTE_CONFIRM_TEXT) {
      return {
        success: false,
        message: `正式执行前请传入 confirm=${EXECUTE_CONFIRM_TEXT}`
      };
    }

    const results = [];
    let totalMatchedQuestionCount = 0;
    let totalMovedCount = 0;
    let totalCreatedPaperCount = 0;

    for (const mapping of mappings) {
      try {
        const topicDoc = await findTopicDoc(examId, mapping);
        const paperDoc = await findPaperDoc(examId, mapping, dryRun);
        const preview = await previewQuestions(examId, topicDoc._id);

        totalMatchedQuestionCount += preview.total;
        if (paperDoc._createdByMigration) {
          totalCreatedPaperCount += 1;
        }

        const itemResult = {
          mappingIndex: mapping.index,
          topicId: topicDoc._id,
          topicTitle: topicDoc.name || mapping.topicTitle,
          paperId: paperDoc._id,
          paperTitle: paperDoc.title || mapping.paperTitle,
          paperYear: Number(paperDoc.year) || mapping.paperYear || null,
          clearTopicId: mapping.clearTopicId,
          createdPaper: !!paperDoc._createdByMigration,
          willCreatePaper: !!paperDoc._willCreateByMigration,
          matchedQuestionCount: preview.total,
          movedCount: 0,
          sampleQuestions: preview.sample
        };

        if (!dryRun && preview.total > 0) {
          const moveResult = await moveQuestions(examId, topicDoc, paperDoc, mapping.clearTopicId);
          itemResult.movedCount = moveResult.movedCount;
          itemResult.batchCount = moveResult.batchCount;
          totalMovedCount += moveResult.movedCount;
        }

        results.push(itemResult);
      } catch (error) {
        results.push({
          mappingIndex: mapping.index,
          topicId: mapping.topicId,
          topicTitle: mapping.topicTitle,
          paperId: mapping.paperId,
          paperTitle: mapping.paperTitle,
          error: error.message
        });
      }
    }

    const failedCount = results.filter(item => item.error).length;
    return {
      success: failedCount === 0,
      message: dryRun
        ? `预检查完成：匹配 ${totalMatchedQuestionCount} 道题，异常 ${failedCount} 项`
        : `迁移完成：移动 ${totalMovedCount} 道题，异常 ${failedCount} 项`,
      data: {
        dryRun,
        examId,
        examName: examDoc.name || '',
        confirmRequired: EXECUTE_CONFIRM_TEXT,
        totalMatchedQuestionCount,
        totalMovedCount,
        totalCreatedPaperCount,
        failedCount,
        results
      }
    };
  } catch (error) {
    console.error('[adminMoveTopicQuestionsToPaperOnce] error', error);
    return {
      success: false,
      message: '一次性专题转试卷迁移失败',
      error: error.message
    };
  }
};
