const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

async function getQuestionCount(paperId) {
  const result = await db.collection('questions')
    .where({ paperId })
    .count();

  return result.total || 0;
}

exports.main = async (event = {}) => {
  try {
    const where = {
      isActive: true
    };

    if (event.examId) {
      where.examId = event.examId;
    }

    const result = await db.collection('papers')
      .where(where)
      .orderBy('year', 'desc')
      .orderBy('order', 'asc')
      .orderBy('createdAt', 'asc')
      .get();

    const papers = await Promise.all((result.data || []).map(async (paper) => ({
      ...paper,
      questionCount: await getQuestionCount(paper._id)
    })));

    return {
      success: true,
      data: papers
    };
  } catch (error) {
    console.error('[getPapers] error', error);
    return {
      success: false,
      message: '获取试卷失败',
      error: error.message
    };
  }
};
