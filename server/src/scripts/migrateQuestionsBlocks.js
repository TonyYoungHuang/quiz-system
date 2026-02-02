const mongoose = require('mongoose');
const Question = require('../models/Question');

const toTextBlocks = (text) => (text ? [{ type: 'text', content: { zh: text } }] : []);

const toOptionBlocks = (opt) => ({
  key: opt.key,
  value: opt.value,
  content: toTextBlocks(opt.value)
});

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz_system');

  const cursor = Question.find({ $or: [{ stem: { $exists: false } }, { analysis: { $exists: false } }] }).cursor();
  let updated = 0;

  for await (const q of cursor) {
    const update = {};

    if (!q.stem || q.stem.length === 0) {
      update.stem = toTextBlocks(q.content);
    }

    if (Array.isArray(q.options) && q.options.length > 0) {
      const hasContentBlocks = q.options.some(opt => Array.isArray(opt.content) && opt.content.length > 0);
      if (!hasContentBlocks) {
        update.options = q.options.map(toOptionBlocks);
      }
    }

    if (!q.analysis || q.analysis.length === 0) {
      update.analysis = toTextBlocks(q.explanation);
    }

    if ((!q.media || q.media.length === 0) && q.mediaUrl) {
      update.media = [{ type: 'image', url: q.mediaUrl, desc: '' }];
    }

    if (Object.keys(update).length > 0) {
      await Question.updateOne({ _id: q._id }, { $set: update });
      updated += 1;
    }
  }

  console.log(`Migration completed. Updated ${updated} questions.`);
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
