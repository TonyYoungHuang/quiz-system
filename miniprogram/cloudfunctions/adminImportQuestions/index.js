// 浜戝嚱鏁板叆鍙ｆ枃浠?
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 浜戝嚱鏁板叆鍙ｅ嚱鏁?
exports.main = async (event, context) => {
  const { token, examId, questions, mode = 'append' } = event;

  try {
    // 楠岃瘉token
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

    // 楠岃瘉examId鏄惁瀛樺湪
    const exam = await db.collection('exams')
      .doc(examId)
      .get();

    if (!exam.data) {
      return {
        success: false,
        message: '绉戠洰涓嶅瓨鍦?
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

    // 鎵归噺娣诲姞棰樼洰
    const successCount = { value: 0 };
    const failCount = { value: 0 };
    const errors = [];

    // 浜戝嚱鏁板崟娆℃渶澶氭搷浣?0鏉¤褰曪紝闇€瑕佸垎鎵?
    const batchSize = 20;
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);

      for (const q of batch) {
        try {
          // 鐢熸垚棰樼洰ID
          const _id = 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

          // 澶勭悊閫夐」鏍煎紡锛氭敮鎸丆SV鐨勯€楀彿鍒嗛殧鍜岀閬撶鍒嗛殧
          let options = {};
          if (typeof q.options === 'string') {
            // 灏濊瘯瑙ｆ瀽JSON
            try {
              options = JSON.parse(q.options);
            } catch (e) {
              // 濡傛灉涓嶆槸JSON锛屾寜绠￠亾绗︽垨閫楀彿鍒嗛殧
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

          // 澶勭悊绛旀鏍煎紡
          let answer = q.answer;
          if (q.type === 'MULTI' && typeof answer === 'string') {
            // 澶氶€夐绛旀鍙兘鏄?"AB" 鎴?["A", "B"]
            answer = answer.split('').filter(c => ['A', 'B', 'C', 'D', 'E', 'F'].includes(c));
          } else if (q.type === 'JUDGE') {
            // 鍒ゆ柇棰樼瓟妗堝彲鑳芥槸 "true"/"false"/"A"/"B"
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
            question: q.content || '鏈煡棰樼洰',
            error: error.message
          });
        }
      }
    }

    return {
      success: true,
      message: `瀵煎叆瀹屾垚锛氭垚鍔?${successCount.value} 鏉★紝澶辫触 ${failCount.value} 鏉,
      data: {
        successCount: successCount.value,
        failCount: failCount.value,
        errors: errors,
        deletedCount: deletedCount
      }
    };
  } catch (error) {
    console.error('鎵归噺瀵煎叆棰樼洰澶辫触:', error);
    return {
      success: false,
      message: '鎵归噺瀵煎叆棰樼洰澶辫触',
      error: error.message
    };
  }
};
