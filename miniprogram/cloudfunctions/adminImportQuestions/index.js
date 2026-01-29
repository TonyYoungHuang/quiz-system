// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const { token, examId, questions, mode = 'append' } = event;

  try {
    // 验证token
    const tokenResult = await db.collection('admin_tokens')
      .where({ token: token })
      .get();

    if (tokenResult.data.length === 0) {
      return {
        success: false,
        message: '???????????'
      };
    }

    const tokenData = tokenResult.data[0];
    if (tokenData.expiresAt) {
      const exp = new Date(tokenData.expiresAt).getTime();
      if (!Number.isNaN(exp) && exp <= Date.now()) {
        await db.collection('admin_tokens').doc(tokenData._id).remove();
        return {
          success: false,
          message: '???????????'
        };
      }
    }

    // 验证examId是否存在
    const exam = await db.collection('exams')
      .doc(examId)
      .get();

    if (!exam.data) {
      return {
        success: false,
        message: '科目不存在'
      };
    }


    let deletedCount = 0;
    if (mode === 'overwrite') {
      const batchSize = 50;
      while (true) {
        const batch = await db.collection('questions')
          .where({ examId: examId })
          .limit(batchSize)
          .get();

        if (!batch.data || batch.data.length == 0) {
          break;
        }

        const ids = batch.data.map(d => d._id);
        await Promise.all(ids.map(id => db.collection('questions').doc(id).remove()));
        deletedCount += ids.length;
      }
    }

    // 批量添加题目
    const successCount = { value: 0 };
    const failCount = { value: 0 };
    const errors = [];

    // 云函数单次最多操作20条记录，需要分批
    const batchSize = 20;
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);

      for (const q of batch) {
        try {
          // 生成题目ID
          const _id = 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

          // 处理选项格式：支持CSV的逗号分隔和管道符分隔
          let options = {};
          if (typeof q.options === 'string') {
            // 尝试解析JSON
            try {
              options = JSON.parse(q.options);
            } catch (e) {
              // 如果不是JSON，按管道符或逗号分隔
              const parts = q.options.split(/[|,]/).filter(s => s.trim());
              const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
              parts.forEach((part, idx) => {
                if (idx < labels.length) {
                  options[labels[idx]] = part.trim();
                }
              });
            }
          } else if (typeof q.options === 'object') {
            options = q.options;
          }

          // 处理答案格式
          let answer = q.answer;
          if (q.type === 'MULTI' && typeof answer === 'string') {
            // 多选题答案可能是 "AB" 或 ["A", "B"]
            answer = answer.split('').filter(c => ['A', 'B', 'C', 'D', 'E', 'F'].includes(c));
          } else if (q.type === 'JUDGE') {
            // 判断题答案可能是 "true"/"false"/"A"/"B"
            if (answer === 'A' || answer === 'true') {
              answer = 'true';
            } else if (answer === 'B' || answer === 'false') {
              answer = 'false';
            }
          }

          await db.collection('questions').add({
            data: {
              _id: _id,
              examId: examId,
              type: q.type || 'SINGLE',
              content: q.content || '',
              options: options,
              answer: answer,
              explanation: q.explanation || '',
              sortOrder: q.sortOrder || 0,
              createdAt: new Date()
            }
          });

          successCount.value++;
        } catch (error) {
          failCount.value++;
          errors.push({
            question: q.content || '未知题目',
            error: error.message
          });
        }
      }
    }

    return {
      success: true,
      message: `导入完成：成功 ${successCount.value} 条，失败 ${failCount.value} 条`,
      data: {
        successCount: successCount.value,
        failCount: failCount.value,
        errors: errors,
        deletedCount: deletedCount
      }
    };
  } catch (error) {
    console.error('批量导入题目失败:', error);
    return {
      success: false,
      message: '批量导入题目失败',
      error: error.message
    };
  }
};
