const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event = {}) => {
  try {
    const exams = [];
    let skip = 0;

    while (true) {
      const result = await db.collection('exams')
        .orderBy('sortOrder', 'asc')
        .skip(skip)
        .limit(100)
        .get();

      const batch = result.data || [];
      exams.push(...batch);
      if (batch.length < 100) break;
      skip += 100;
    }

    const filteredExams = exams.filter((exam) => {
      if (exam.isActive === false) return false;
      if (event.category && exam.category !== event.category) return false;
      return true;
    });

    const examsWithCount = [];
    for (const exam of filteredExams) {
      const countResult = await db.collection('questions').where({ examId: exam._id }).count();
      examsWithCount.push({
        ...exam,
        questionCount: countResult.total || 0
      });
    }

    return {
      success: true,
      data: examsWithCount
    };
  } catch (error) {
    console.error('[getExams] error', error);
    return {
      success: false,
      message: '获取科目列表失败',
      error: error.message
    };
  }
};
