const typeMap = {
  '单选题': 'SINGLE',
  '单选': 'SINGLE',
  '多选题': 'MULTI',
  '多选': 'MULTI',
  '判断题': 'JUDGE',
  '判断': 'JUDGE',
  '填空题': 'BLANK',
  '填空': 'BLANK',
  '简答题': 'SHORT',
  '简答': 'SHORT',
  '材料题': 'CASE',
  '计算题': 'CALC'
};

const toTextBlocks = (text) => (text ? [{ type: 'text', content: { zh: text } }] : []);

const normalizeOptions = (options) => {
  if (!Array.isArray(options)) return [];
  return options.map(opt => {
    if (Array.isArray(opt.content) && opt.content.length > 0) {
      return opt;
    }
    if (opt.value) {
      return { ...opt, content: toTextBlocks(opt.value) };
    }
    return opt;
  });
};

const normalizeQuestion = (q) => {
  const out = { ...q };
  if (!out.stem || out.stem.length === 0) {
    out.stem = toTextBlocks(out.content || '');
  }
  if (out.content == null) {
    out.content = out.stem && out.stem[0] && out.stem[0].content ? out.stem[0].content.zh : '';
  }
  if (!out.analysis || out.analysis.length === 0) {
    out.analysis = toTextBlocks(out.explanation || '');
  }
  out.options = normalizeOptions(out.options);
  if (out.explanation == null && Array.isArray(out.analysis) && out.analysis[0] && out.analysis[0].content) {
    out.explanation = out.analysis[0].content.zh;
  }
  return out;
};

function parseCsvLine(line) {
  const parts = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.map(p => p.trim());
}

function parseCsv(text) {
  const lines = String(text || '').split(/\r?\n/).filter(l => l.trim());
  const questions = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = parseCsvLine(line);
    if (i === 0 && parts[0] && parts[0].includes('题型')) continue;
    if (parts.length < 3) continue;
    const rawType = parts[0].trim();
    const type = typeMap[rawType] || (rawType || '').toUpperCase() || 'SINGLE';
    const content = parts[1] ? parts[1].trim() : '';
    const optionA = parts[2] ? parts[2].trim() : '';
    const optionB = parts[3] ? parts[3].trim() : '';
    const optionC = parts[4] ? parts[4].trim() : '';
    const optionD = parts[5] ? parts[5].trim() : '';
    const answer = parts[6] ? parts[6].trim() : '';
    const explanation = parts[7] ? parts[7].trim() : '';

    const options = [];
    if (type === 'JUDGE') {
      options.push({ key: 'A', value: '正确', content: toTextBlocks('正确') });
      options.push({ key: 'B', value: '错误', content: toTextBlocks('错误') });
    } else {
      if (optionA) options.push({ key: 'A', value: optionA, content: toTextBlocks(optionA) });
      if (optionB) options.push({ key: 'B', value: optionB, content: toTextBlocks(optionB) });
      if (optionC) options.push({ key: 'C', value: optionC, content: toTextBlocks(optionC) });
      if (optionD) options.push({ key: 'D', value: optionD, content: toTextBlocks(optionD) });
    }

    let normalizedAnswer = answer;
    if (type === 'MULTI') {
      normalizedAnswer = answer.split('').filter(Boolean);
    }

    questions.push({
      type,
      content,
      stem: toTextBlocks(content),
      options,
      answer: normalizedAnswer,
      explanation,
      analysis: toTextBlocks(explanation)
    });
  }
  return questions.map(normalizeQuestion);
}

function parseJsonl(text) {
  const lines = String(text || '').split(/\r?\n/).filter(l => l.trim());
  const questions = [];
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      questions.push(normalizeQuestion(obj));
    } catch (_) {
      // ignore invalid line
    }
  }
  return questions;
}

function validateQuestions(questions) {
  const errors = [];
  const isChoice = (t) => ['SINGLE', 'MULTI', 'JUDGE'].includes(t);

  questions.forEach((q, index) => {
    if (!q.type) errors.push({ index, error: 'type is required' });
    const hasStem = Array.isArray(q.stem) && q.stem.length > 0;
    const hasContent = typeof q.content === 'string' && q.content.trim().length > 0;
    if (!hasStem && !hasContent) errors.push({ index, error: 'stem/content is required' });
    if (q.type === 'CASE') {
      if (!Array.isArray(q.children) || q.children.length === 0) {
        errors.push({ index, error: 'CASE requires children' });
      }
    }
    if (isChoice(q.type)) {
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push({ index, error: 'options required for choice' });
      } else {
        const keys = new Set(q.options.map(o => o.key));
        if (q.type === 'SINGLE' || q.type === 'JUDGE') {
          if (!keys.has(q.answer)) {
            errors.push({ index, error: 'answer not in options' });
          }
        }
        if (q.type === 'MULTI') {
          if (!Array.isArray(q.answer)) {
            errors.push({ index, error: 'MULTI answer must be array' });
          } else {
            const invalid = q.answer.find(a => !keys.has(a));
            if (invalid) errors.push({ index, error: 'MULTI answer not in options' });
          }
        }
      }
    }
    if (q.type === 'BLANK') {
      if (!Array.isArray(q.answer) || q.answer.length === 0) {
        errors.push({ index, error: 'BLANK answer must be array' });
      }
    }
  });

  return errors;
}

module.exports = {
  parseCsv,
  parseJsonl,
  normalizeQuestion,
  validateQuestions
};
