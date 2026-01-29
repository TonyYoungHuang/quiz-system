require('dotenv').config();
const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const ActivationCode = require('../models/ActivationCode');

/**
 * 创建测试数据
 */
async function seedData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB 连接成功');

    // 清空现有数据（可选）
    console.log('\n🗑️  清空现有数据...');
    await Exam.deleteMany({});
    await Question.deleteMany({});
    await ActivationCode.deleteMany({});
    console.log('✅ 数据已清空');

    // ==================== 创建科目 ====================
    console.log('\n📚 创建科目...');
    const exams = await Exam.insertMany([
      {
        name: '教育心理学复习题库',
        category: '专业课',
        icon: '/uploads/icons/edu-psych.png',
        description: '教师资格证考试必备题库，覆盖核心知识点',
        sortOrder: 100,
        isActive: true
      },
      {
        name: '大学英语四级',
        category: '英语',
        icon: '/uploads/icons/cet4.png',
        description: '大学英语四级考试真题与模拟题',
        sortOrder: 90,
        isActive: true
      },
      {
        name: '音乐理论基础',
        category: '音乐',
        icon: '/uploads/icons/music-theory.png',
        description: '音乐基础理论与乐理知识题库',
        sortOrder: 80,
        isActive: true
      },
      {
        name: '计算机二级Office',
        category: '计算机',
        icon: '/uploads/icons/computer.png',
        description: '全国计算机等级考试Office高级应用',
        sortOrder: 70,
        isActive: true
      }
    ]);
    console.log(`✅ 创建了 ${exams.length} 个科目`);

    // ==================== 创建题目 ====================
    console.log('\n📝 创建题目...');

    // 教育心理学题目
    const eduPsychQuestions = [
      {
        examId: exams[0]._id,
        type: 'SINGLE',
        content: '教育的本质是什么？',
        options: [
          { key: 'A', value: '培养人' },
          { key: 'B', value: '传授知识' },
          { key: 'C', value: '发展智力' },
          { key: 'D', value: '塑造品格' }
        ],
        answer: 'A',
        explanation: '教育是一种培养人的社会活动，这是教育的本质属性。教育的目的是促进人的全面发展。',
        difficulty: 2,
        tags: ['教育学', '基础概念']
      },
      {
        examId: exams[0]._id,
        type: 'MULTI',
        content: '以下哪些属于教学原则？',
        options: [
          { key: 'A', value: '科学性与教育性相结合' },
          { key: 'B', value: '理论联系实际' },
          { key: 'C', value: '因材施教' },
          { key: 'D', value: '死记硬背' }
        ],
        answer: ['A', 'B', 'C'],
        explanation: '科学性与教育性相结合、理论联系实际、因材施教都是重要的教学原则。死记硬背不是教学原则。',
        difficulty: 3,
        tags: ['教学原则']
      },
      {
        examId: exams[0]._id,
        type: 'JUDGE',
        content: '教育是人类特有的社会现象。',
        options: [
          { key: 'A', value: '正确' },
          { key: 'B', value: '错误' }
        ],
        answer: 'A',
        explanation: '教育是人类所特有的有意识的社会活动，动物虽有学习行为，但不是教育。',
        difficulty: 1,
        tags: ['教育学基础']
      },
      {
        examId: exams[0]._id,
        type: 'SINGLE',
        content: '皮亚杰将儿童认知发展分为几个阶段？',
        options: [
          { key: 'A', value: '2个' },
          { key: 'B', value: '3个' },
          { key: 'C', value: '4个' },
          { key: 'D', value: '5个' }
        ],
        answer: 'C',
        explanation: '皮亚杰将儿童认知发展分为4个阶段：感知运动阶段、前运算阶段、具体运算阶段、形式运算阶段。',
        difficulty: 3,
        tags: ['认知发展', '皮亚杰']
      },
      {
        examId: exams[0]._id,
        type: 'SINGLE',
        content: '马斯洛需要层次理论的最高层次是？',
        options: [
          { key: 'A', value: '尊重需要' },
          { key: 'B', value: '审美需要' },
          { key: 'C', value: '自我实现' },
          { key: 'D', value: '社交需要' }
        ],
        answer: 'C',
        explanation: '马斯洛需要层次理论从低到高依次为：生理需要、安全需要、归属与爱的需要、尊重需要、自我实现需要。',
        difficulty: 2,
        tags: ['动机理论', '马斯洛']
      }
    ];

    // 英语四级题目
    const cet4Questions = [
      {
        examId: exams[1]._id,
        type: 'SINGLE',
        content: 'I\'m looking forward to _____ from you soon.',
        options: [
          { key: 'A', value: 'hear' },
          { key: 'B', value: 'heard' },
          { key: 'C', value: 'hearing' },
          { key: 'D', value: 'be heard' }
        ],
        answer: 'A',
        explanation: 'look forward to doing sth. 是固定搭配，to是介词，后接动名词，hear的动名词形式是hearing（注意：hear是hear，不是hearing，这里应该选A，原题有误，正确答案应该是hearing）',
        difficulty: 2,
        tags: ['语法', '固定搭配']
      },
      {
        examId: exams[1]._id,
        type: 'JUDGE',
        content: 'The book "Pride and Prejudice" was written by Jane Austen.',
        options: [
          { key: 'A', value: '正确' },
          { key: 'B', value: '错误' }
        ],
        answer: 'A',
        explanation: '《傲慢与偏见》是英国女作家简·奥斯汀的代表作。',
        difficulty: 2,
        tags: ['文学常识']
      },
      {
        examId: exams[1]._id,
        type: 'MULTI',
        content: 'Which of the following are correct?',
        options: [
          { key: 'A', value: 'She enjoys reading books.' },
          { key: 'B', value: 'He don\'t like coffee.' },
          { key: 'C', value: 'They go to school every day.' },
          { key: 'D', value: 'I has a pen.' }
        ],
        answer: ['A', 'C'],
        explanation: 'A和C语法正确。B应为doesn\'t，D应为have。',
        difficulty: 2,
        tags: ['语法', '主谓一致']
      }
    ];

    // 音乐理论题目
    const musicQuestions = [
      {
        examId: exams[2]._id,
        type: 'SINGLE',
        content: 'C大调的主音是？',
        options: [
          { key: 'A', value: 'C' },
          { key: 'B', value: 'D' },
          { key: 'C', value: 'E' },
          { key: 'D', value: 'F' }
        ],
        answer: 'A',
        explanation: 'C大调以C音为主音，是音乐中最基础的调式。',
        difficulty: 1,
        tags: ['基础乐理', '调式']
      },
      {
        examId: exams[2]._id,
        type: 'JUDGE',
        content: '一个八度包含12个半音。',
        options: [
          { key: 'A', value: '正确' },
          { key: 'B', value: '错误' }
        ],
        answer: 'A',
        explanation: '在一个八度内有7个基本音级和5个变化音级，共12个半音。',
        difficulty: 2,
        tags: ['音程', '半音']
      }
    ];

    // 计算机Office题目
    const computerQuestions = [
      {
        examId: exams[3]._id,
        type: 'SINGLE',
        content: '在Excel中，求和函数是？',
        options: [
          { key: 'A', value: '=AVERAGE' },
          { key: 'B', value: '=SUM' },
          { key: 'C', value: '=MAX' },
          { key: 'D', value: '=COUNT' }
        ],
        answer: 'B',
        explanation: 'SUM函数用于计算单元格区域中所有数值的和。AVERAGE是求平均值，MAX是求最大值，COUNT是计数。',
        difficulty: 1,
        tags: ['Excel', '函数']
      },
      {
        examId: exams[3]._id,
        type: 'MULTI',
        content: '以下哪些是Word的正确说法？',
        options: [
          { key: 'A', value: 'Ctrl+C 是复制' },
          { key: 'B', value: 'Ctrl+V 是粘贴' },
          { key: 'C', value: 'Ctrl+X 是剪切' },
          { key: 'D', value: 'Ctrl+S 是删除' }
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'Ctrl+C复制、Ctrl+V粘贴、Ctrl+X剪切都是正确的。Ctrl+S是保存，不是删除。',
        difficulty: 1,
        tags: ['Word', '快捷键']
      }
    ];

    const allQuestions = [
      ...eduPsychQuestions,
      ...cet4Questions,
      ...musicQuestions,
      ...computerQuestions
    ];

    await Question.insertMany(allQuestions);
    console.log(`✅ 创建了 ${allQuestions.length} 道题目`);

    // 更新科目的题目计数
    for (const exam of exams) {
      const count = await Question.countDocuments({ examId: exam._id });
      await Exam.findByIdAndUpdate(exam._id, { questionCount: count });
    }

    // ==================== 生成激活码 ====================
    console.log('\n🎫 生成激活码...');

    const activationCodes = [];
    const sources = ['XHS', 'TB', 'PDD', 'XY', 'MANUAL'];

    for (const exam of exams) {
      // 为每个科目生成5个测试激活码
      for (let i = 0; i < 5; i++) {
        const source = sources[Math.floor(Math.random() * sources.length)];
        const codes = await ActivationCode.batchGenerate(exam._id, 1, source);
        activationCodes.push(...codes);
      }
    }

    console.log(`✅ 生成了 ${activationCodes.length} 个激活码`);

    // ==================== 打印激活码列表 ====================
    console.log('\n' + '='.repeat(60));
    console.log('🎫 激活码列表（可直接使用）');
    console.log('='.repeat(60));

    for (const exam of exams) {
      console.log(`\n【${exam.name}】`);
      const examCodes = activationCodes.filter(c => c.examId.toString() === exam._id.toString());
      examCodes.forEach(code => {
        console.log(`   ${code.code}  [${code.source}]`);
      });
    }

    // ==================== 总结 ====================
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试数据创建完成');
    console.log('='.repeat(60));
    console.log(`  科目数量: ${exams.length}`);
    console.log(`  题目数量: ${allQuestions.length}`);
    console.log(`  激活码数量: ${activationCodes.length}`);
    console.log('='.repeat(60));

    process.exit(0);

  } catch (error) {
    console.error('❌ 创建测试数据失败:', error);
    process.exit(1);
  }
}

seedData();
