// ==================== 配置 ====================
const API_BASE = '/api/v1';
const ADMIN_PASSWORD = 'admin123'; // 简单密码认证，生产环境应该使用更安全的方式

// ==================== 全局状态 ====================
let currentPage = 'dashboard';
let currentExamFilter = '';
let currentTypeFilter = '';

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
  // 检查登录状态
  if (localStorage.getItem('adminLoggedIn') === 'true') {
    showMainScreen();
  }

  // 绑定事件
  bindEvents();
});

// ==================== 事件绑定 ====================
function bindEvents() {
  // 登录表单
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  // 导航菜单
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = e.currentTarget.dataset.page;
      navigateTo(page);
    });
  });

  // 模态框关闭（只点击关闭按钮才关闭，防止误操作丢失数据）
  document.getElementById('modal-close').addEventListener('click', closeModal);

  // 科目管理
  document.getElementById('add-exam-btn').addEventListener('click', showAddExamModal);

  // 题目管理
  document.getElementById('add-question-btn').addEventListener('click', showAddQuestionModal);
  document.getElementById('import-questions-btn').addEventListener('click', showImportModal);
  document.getElementById('question-exam-filter').addEventListener('change', loadQuestions);
  document.getElementById('question-type-filter').addEventListener('change', loadQuestions);

  // 专题管理
  const addTopicBtn = document.getElementById('add-topic-btn');
  if (addTopicBtn) addTopicBtn.addEventListener('click', showAddTopicModal);
  const topicExamFilter = document.getElementById('topic-exam-filter');
  if (topicExamFilter) topicExamFilter.addEventListener('change', loadTopics);

  // 真题管理
  const addPaperBtn = document.getElementById('add-paper-btn');
  if (addPaperBtn) addPaperBtn.addEventListener('click', showAddPaperModal);
  const paperExamFilter = document.getElementById('paper-exam-filter');
  if (paperExamFilter) paperExamFilter.addEventListener('change', loadPapers);

  // 导入任务
  const createImportTaskBtn = document.getElementById('create-import-task-btn');
  if (createImportTaskBtn) createImportTaskBtn.addEventListener('click', showCreateImportTaskModal);

  // 激活码管理
  document.getElementById('generate-codes-btn').addEventListener('click', showGenerateCodesModal);
  document.getElementById('code-exam-filter').addEventListener('change', loadCodes);
}

// ==================== 认证相关 ====================
function handleLogin(e) {
  e.preventDefault();
  const password = document.getElementById('admin-password').value;

  if (password === ADMIN_PASSWORD) {
    localStorage.setItem('adminLoggedIn', 'true');
    showMainScreen();
    showToast('登录成功', 'success');
  } else {
    showToast('密码错误', 'error');
  }
}

function handleLogout() {
  localStorage.removeItem('adminLoggedIn');
  document.getElementById('main-screen').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('admin-password').value = '';
  showToast('已退出登录', 'success');
}

function showMainScreen() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('main-screen').classList.remove('hidden');
  loadDashboard();
}

// ==================== 页面导航 ====================
function navigateTo(page) {
  currentPage = page;

  // 更新导航状态
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`[data-page="${page}"]`).classList.add('active');

  // 更新页面标题
  const titles = {
    dashboard: '数据概览',
    exams: '科目管理',
    questions: '题目管理',
    codes: '激活码管理',
    users: '用户管理',
    topics: '专题管理',
    papers: '真题管理',
    imports: '导入任务'
  };
  document.getElementById('page-title').textContent = titles[page];

  // 显示对应页面
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`${page}-page`).classList.add('active');

  // 加载数据
  switch (page) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'exams':
      loadExams();
      break;
    case 'questions':
      loadExamFilters();
      loadQuestions();
      break;
    case 'codes':
      loadCodeFilters();
      loadCodes();
      break;
    case 'topics':
      loadTopicFilters();
      loadTopics();
      break;
    case 'papers':
      loadPaperFilters();
      loadPapers();
      break;
    case 'imports':
      loadImportTasks();
      break;
    case 'users':
      loadUsers();
      break;
  }
}

// ==================== API 调用 ====================
async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API 请求失败:', error);
    showToast('网络请求失败', 'error');
    return null;
  }
}

// ==================== 数据概览 ====================
async function loadDashboard() {
  const [examsRes, questionsRes, codesRes, permissionsRes] = await Promise.all([
    apiRequest(`${API_BASE}/exams/count/stats`),
    apiRequest(`${API_BASE}/questions/admin/count`),
    apiRequest(`${API_BASE}/codes/count`),
    apiRequest(`${API_BASE}/permissions/count`)
  ]);

  document.getElementById('stat-exams').textContent = examsRes?.data?.count || 0;
  document.getElementById('stat-questions').textContent = questionsRes?.data?.count || 0;
  document.getElementById('stat-codes').textContent = codesRes?.data?.count || 0;
  document.getElementById('stat-users').textContent = permissionsRes?.data?.count || 0;
}

// ==================== 科目管理 ====================
async function loadExams() {
  const res = await apiRequest(`${API_BASE}/exams`);
  if (!res?.success) return;

  const tbody = document.getElementById('exams-table-body');
  tbody.innerHTML = res.data.map(exam => `
    <tr>
      <td>${exam.icon || '📚'}</td>
      <td>${exam.name}</td>
      <td>${exam.category || '-'}</td>
      <td>${exam.questionCount || 0}</td>
      <td>
        <span class="badge ${exam.isActive ? 'badge-success' : 'badge-danger'}">
          ${exam.isActive ? '启用' : '禁用'}
        </span>
      </td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-sm btn-outline" onclick="editExam('${exam._id}')">编辑</button>
          <button class="btn btn-sm btn-danger" onclick="deleteExam('${exam._id}')">删除</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function showAddExamModal() {
  showModal('添加科目', `
    <form id="exam-form">
      <div class="form-group">
        <label>科目名称 *</label>
        <input type="text" class="form-control" name="name" required>
      </div>
      <div class="form-group">
        <label>分类</label>
        <input type="text" class="form-control" name="category" placeholder="如：教师资格证">
      </div>
      <div class="form-group">
        <label>图标（Emoji）</label>
        <input type="text" class="form-control" name="icon" placeholder="如：📚">
      </div>
      <div class="form-group">
        <label>描述</label>
        <textarea class="form-control" name="description" rows="3"></textarea>
      </div>
      <div class="form-group">
        <label>排序</label>
        <input type="number" class="form-control" name="sortOrder" value="0">
      </div>
      <button type="submit" class="btn btn-primary" style="width: 100%">提交</button>
    </form>
  `);

  document.getElementById('exam-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    const res = await apiRequest(`${API_BASE}/exams/admin`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (res?.success) {
      showToast('科目添加成功', 'success');
      closeModal();
      loadExams();
    }
  });
}

async function editExam(id) {
  const res = await apiRequest(`${API_BASE}/exams/${id}`);
  if (!res?.success) return;

  const exam = res.data;
  showModal('编辑科目', `
    <form id="exam-form">
      <div class="form-group">
        <label>科目名称 *</label>
        <input type="text" class="form-control" name="name" value="${exam.name}" required>
      </div>
      <div class="form-group">
        <label>分类</label>
        <input type="text" class="form-control" name="category" value="${exam.category || ''}">
      </div>
      <div class="form-group">
        <label>图标（Emoji）</label>
        <input type="text" class="form-control" name="icon" value="${exam.icon || ''}">
      </div>
      <div class="form-group">
        <label>描述</label>
        <textarea class="form-control" name="description" rows="3">${exam.description || ''}</textarea>
      </div>
      <div class="form-group">
        <label>排序</label>
        <input type="number" class="form-control" name="sortOrder" value="${exam.sortOrder || 0}">
      </div>
      <button type="submit" class="btn btn-primary" style="width: 100%">提交</button>
    </form>
  `);

  document.getElementById('exam-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    const res = await apiRequest(`${API_BASE}/exams/admin/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });

    if (res?.success) {
      showToast('科目更新成功', 'success');
      closeModal();
      loadExams();
    }
  });
}

async function deleteExam(id) {
  if (!confirm('确定要删除这个科目吗？相关题目和激活码也会被删除。')) return;

  const res = await apiRequest(`${API_BASE}/exams/admin/${id}`, {
    method: 'DELETE'
  });

  if (res?.success) {
    showToast('科目删除成功', 'success');
    loadExams();
  }
}

// ==================== 题目管理 ====================
async function loadExamFilters() {
  const res = await apiRequest(`${API_BASE}/exams`);
  if (!res?.success) return;

  const options = res.data.map(exam =>
    `<option value="${exam._id}">${exam.name}</option>`
  ).join('');

  document.getElementById('question-exam-filter').innerHTML = `<option value="">全部科目</option>${options}`;
}

async function loadQuestions() {
  const examId = document.getElementById('question-exam-filter').value;
  const type = document.getElementById('question-type-filter').value;

  let url = `${API_BASE}/questions/admin`;
  const params = new URLSearchParams();
  if (examId) params.append('examId', examId);
  if (type) params.append('type', type);
  if (params.toString()) url += '?' + params.toString();

  const res = await apiRequest(url);
  if (!res?.success) return;

  const tbody = document.getElementById('questions-table-body');
  tbody.innerHTML = res.data.map(q => `
    <tr>
      <td>
        <span class="badge badge-warning">${getTypeName(q.type)}</span>
      </td>
      <td>${q.content.substring(0, 50)}${q.content.length > 50 ? '...' : ''}</td>
      <td>${q.examId?.name || '-'}</td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-sm btn-outline" onclick="editQuestion('${q._id}')">编辑</button>
          <button class="btn btn-sm btn-danger" onclick="deleteQuestion('${q._id}')">删除</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function getTypeName(type) {
  const names = { SINGLE: '单选', MULTI: '多选', JUDGE: '判断' };
  return names[type] || type;
}

function showAddQuestionModal() {
  const res = apiRequest(`${API_BASE}/exams`);

  showModal('添加题目', `
    <form id="question-form">
      <div class="form-group">
        <label>科目 *</label>
        <select class="form-select" name="examId" required id="question-exam-select">
          <option value="">请选择科目</option>
        </select>
      </div>
      <div class="form-group">
        <label>题型 *</label>
        <select class="form-select" name="type" required>
          <option value="SINGLE">单选题</option>
          <option value="MULTI">多选题</option>
          <option value="JUDGE">判断题</option>
        </select>
      </div>
      <div class="form-group">
        <label>题目内容 *</label>
        <textarea class="form-control" name="content" rows="3" required></textarea>
      </div>
      <div class="form-group">
        <label>选项（每行一个，格式：A.选项内容）</label>
        <textarea class="form-control" name="options" rows="4" placeholder="A.选项一&#10;B.选项二&#10;C.选项三&#10;D.选项四"></textarea>
      </div>
      <div class="form-group">
        <label>正确答案 *</label>
        <input type="text" class="form-control" name="answer" placeholder="单选填A，多选填ABC" required>
      </div>
      <div class="form-group">
        <label>解析</label>
        <textarea class="form-control" name="explanation" rows="2"></textarea>
      </div>
      <button type="submit" class="btn btn-primary" style="width: 100%">提交</button>
    </form>
  `);

  // 填充科目选项
  res.then(r => {
    if (r?.success) {
      const select = document.getElementById('question-exam-select');
      select.innerHTML = '<option value="">请选择科目</option>' +
        r.data.map(e => `<option value="${e._id}">${e.name}</option>`).join('');
    }
  });

  document.getElementById('question-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    // 解析选项
    const optionsText = data.options || '';
    const options = optionsText.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const match = line.match(/^([A-D])\.\s*(.+)$/);
        return match ? { key: match[1], value: match[2] } : null;
      })
      .filter(o => o);

    const payload = {
      examId: data.examId,
      type: data.type,
      content: data.content,
      options: options.length > 0 ? options : [{ key: 'A', value: '是' }, { key: 'B', value: '否' }],
      answer: data.answer.toUpperCase(),
      explanation: data.explanation
    };

    const res = await apiRequest(`${API_BASE}/questions/admin`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res?.success) {
      showToast('题目添加成功', 'success');
      closeModal();
      loadQuestions();
    }
  });
}

function showImportModal() {
  showModal('批量导入题目', `
    <div class="form-group">
      <label>选择科目 *</label>
      <select class="form-select" id="import-exam-select" required>
        <option value="">请选择科目</option>
      </select>
    </div>
    <div class="form-group">
      <label>
        方式一：上传 CSV 文件
        <a href="/admin/template.csv" download="题目导入模板.csv" style="float: right; color: #4A90E2; text-decoration: none; font-size: 14px;">
          📥 下载模板
        </a>
      </label>
      <input type="file" id="csv-file-input" accept=".csv" class="form-control" style="margin-bottom: 8px;">
      <div style="display: flex; gap: 8px; margin-bottom: 8px;">
        <button type="button" id="load-file-btn" class="btn btn-outline" style="flex: 1;">📄 读取 CSV 文件</button>
        <button type="button" id="preview-file-btn" class="btn btn-outline" style="flex: 1;">👁️ 预览解析结果</button>
      </div>
    </div>
    <div class="form-group">
      <label>方式二：粘贴题目数据（Excel/CSV 格式）</label>
      <textarea class="form-control" id="import-data" rows="10" placeholder="题型,题目内容,A选项,B选项,C选项,D选项,答案,解析&#10;单选题示例,以下哪个是正确的？,选项A的内容,选项B的内容,选项C的内容,选项D的内容,A,这是解析内容"></textarea>
    </div>
    <button id="start-import" class="btn btn-primary" style="width: 100%">开始导入</button>
    <p style="margin-top: 12px; font-size: 12px; color: #666;">
      <strong>导入说明：</strong><br>
      1. 点击"下载模板"获取 CSV 模板文件<br>
      2. 在 Excel 中填写题目内容并保存为 CSV 格式<br>
      3. 点击"读取 CSV 文件"按钮上传文件，或直接粘贴数据到文本框<br>
      4. 支持逗号(,)或竖线(|)分隔
    </p>
  `);

  // 填充科目选项
  apiRequest(`${API_BASE}/exams`).then(res => {
    if (res?.success) {
      const select = document.getElementById('import-exam-select');
      select.innerHTML = '<option value="">请选择科目</option>' +
        res.data.map(e => `<option value="${e._id}">${e.name}</option>`).join('');
    }
  });

  // CSV 文件读取功能
  document.getElementById('load-file-btn').addEventListener('click', () => {
    const fileInput = document.getElementById('csv-file-input');
    const file = fileInput.files[0];

    if (!file) {
      showToast('请先选择一个 CSV 文件', 'error');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      showToast('请选择 CSV 格式的文件', 'error');
      return;
    }

    const reader = new FileReader();

    reader.onload = function(event) {
      // 先尝试作为 UTF-8 读取
      const utf8Data = event.target.result;

      // 检测是否为乱码：如果包含大量替换字符或非预期字符，可能是编码问题
      const hasGarbledChars = /[\uFFFD\u00BF][\u00BF-\u00FF]{2,}/.test(utf8Data) ||
                              /[^\x00-\x7F\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef,\n\r|a-zA-Z0-9\s\.,，。、！？（）【】《》""''（）]/.test(utf8Data.substring(0, 1000));

      if (hasGarbledChars) {
        // 如果UTF-8乱码，尝试用GBK重新读取
        const gbkReader = new FileReader();
        gbkReader.onload = function(gbkEvent) {
          try {
            // 使用 TextDecoder 解码 GBK
            const decoder = new TextDecoder('gbk');
            const gbkData = decoder.decode(gbkEvent.target.result);
            document.getElementById('import-data').value = gbkData;
            showToast(`文件 "${file.name}" 读取成功（GBK编码），共 ${gbkData.split('\n').filter(line => line.trim()).length} 行数据`, 'success');
          } catch (e) {
            // 如果 TextDecoder 失败，使用UTF-8结果
            document.getElementById('import-data').value = utf8Data;
            showToast(`文件 "${file.name}" 读取成功，共 ${utf8Data.split('\n').filter(line => line.trim()).length} 行数据`, 'success');
          }
        };
        gbkReader.readAsArrayBuffer(file);
      } else {
        // UTF-8 正常，直接使用
        document.getElementById('import-data').value = utf8Data;
        showToast(`文件 "${file.name}" 读取成功（UTF-8编码），共 ${utf8Data.split('\n').filter(line => line.trim()).length} 行数据，请点击"开始导入"`, 'success');
      }
    };

    reader.onerror = function() {
      showToast('文件读取失败，请重试', 'error');
    };

    reader.readAsText(file, 'UTF-8');
  });

  // 当选择文件后，显示文件名
  document.getElementById('csv-file-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      showToast(`已选择文件: ${file.name}`, 'success');
    }
  });

  // 预览CSV解析结果
  document.getElementById('preview-file-btn').addEventListener('click', () => {
    const data = document.getElementById('import-data').value.trim();
    if (!data) {
      showToast('请先读取CSV文件或粘贴数据', 'error');
      return;
    }

    const lines = data.split('\n').filter(line => line.trim());
    let previewHtml = '<div style="font-size: 12px;">';

    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i];
      let parts = line.includes('|') ? line.split('|').map(p => p.trim()) : line.split(',').map(p => p.trim());

      previewHtml += `
        <div style="margin-bottom: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px;">
          <div style="font-weight: 600; color: #4A90E2;">第 ${i+1} 行（共 ${parts.length} 列）</div>
          ${parts.map((p, idx) => `<div style="margin-left: 12px; color: ${p ? '#333' : '#999'};">列${idx+1}: "${p || '<空>'}"</div>`).join('')}
        </div>
      `;
    }

    if (lines.length > 10) {
      previewHtml += `<div style="text-align: center; color: #666;">... 还有 ${lines.length - 10} 行 ...</div>`;
    }

    previewHtml += '</div>';

    showModal('CSV 解析预览', previewHtml);
  });

  document.getElementById('start-import').addEventListener('click', async () => {
    const examId = document.getElementById('import-exam-select').value;
    const data = document.getElementById('import-data').value.trim();

    if (!examId) {
      showToast('请先选择科目', 'error');
      return;
    }
    if (!data) {
      showToast('请填写或粘贴题目数据', 'error');
      return;
    }

    const lines = data.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      showToast('没有有效的题目数据', 'error');
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const failedItems = []; // 记录失败的详细信息

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 支持逗号或竖线分隔
      let parts;
      if (line.includes('|')) {
        parts = line.split('|').map(p => p.trim());
      } else {
        parts = line.split(',').map(p => p.trim());
      }

      // 跳过空行和标题行
      if (parts.length < 2) continue;
      if (parts[0] === '题型' || parts[0] === '题型' || parts[0].includes('题型')) continue;

      // 至少需要：题型、题目、答案 (3列)
      if (parts.length < 3) {
        failedItems.push({
          line: i + 1,
          reason: '数据格式不完整，至少需要3列（题型、题目、答案）',
          data: line.length > 100 ? line.substring(0, 100) + '...' : line
        });
        failCount++;
        continue;
      }

      const [typeStr, content, optA, optB, optC, optD, answer, explanation] = parts;

      // 验证必填字段
      if (!content || content.trim() === '') {
        failedItems.push({
          line: i + 1,
          reason: '题目内容不能为空',
          data: line.length > 100 ? line.substring(0, 100) + '...' : line
        });
        failCount++;
        continue;
      }

      // 判断题型
      let type = 'SINGLE';
      if (typeStr.includes('多选') || typeStr === '多选题') type = 'MULTI';
      else if (typeStr.includes('判断') || typeStr === '判断题') type = 'JUDGE';

      // 构建选项
      let options = [];
      if (type === 'JUDGE') {
        options = [{ key: 'A', value: '正确' }, { key: 'B', value: '错误' }];
      } else {
        if (optA && optA !== '') options.push({ key: 'A', value: optA });
        if (optB && optB !== '') options.push({ key: 'B', value: optB });
        if (optC && optC !== '') options.push({ key: 'C', value: optC });
        if (optD && optD !== '') options.push({ key: 'D', value: optD });
      }

      // 验证选项（非判断题需要至少2个选项）
      if (type !== 'JUDGE' && options.length < 2) {
        failedItems.push({
          line: i + 1,
          reason: '非判断题至少需要2个选项',
          data: line.length > 100 ? line.substring(0, 100) + '...' : line
        });
        failCount++;
        continue;
      }

      // 验证答案
      if (!answer || answer.trim() === '') {
        failedItems.push({
          line: i + 1,
          reason: '答案不能为空',
          data: line.length > 100 ? line.substring(0, 100) + '...' : line
        });
        failCount++;
        continue;
      }

      const res = await apiRequest(`${API_BASE}/questions/admin`, {
        method: 'POST',
        body: JSON.stringify({
          examId,
          type,
          content,
          options,
          answer: answer.toUpperCase(),
          explanation: explanation || ''
        })
      });

      if (res?.success) {
        successCount++;
      } else {
        // 收集详细的错误信息
        console.error(`第 ${i+1} 行导入失败:`, res);
        failedItems.push({
          line: i + 1,
          reason: res?.message || res?.error || '服务器错误',
          data: `内容: ${content || '空'} | 题型: ${type} | 选项数: ${options.length} | 答案: ${answer || '空'}`,
          fullResponse: res
        });
        failCount++;
      }
    }

    if (successCount === 0 && failCount === 0) {
      showToast('没有导入任何题目，请检查数据格式', 'error');
    } else {
      showToast(`导入完成！成功 ${successCount} 题，失败 ${failCount} 题`, successCount > 0 ? 'success' : 'error');

      // 如果有失败的，显示详细错误报告
      if (failedItems.length > 0) {
        setTimeout(() => {
          showImportErrorReport(failedItems, successCount);
        }, 500);
      }
    }

    if (successCount > 0) {
      closeModal();
      loadQuestions();
    }
  });
}

// 显示导入错误报告
function showImportErrorReport(failedItems, successCount) {
  const failedList = failedItems.map(item => `
    <div style="padding: 12px; margin-bottom: 8px; background: #FFF1F0; border-left: 3px solid #FF4D4F; border-radius: 4px;">
      <div style="font-weight: 600; color: #FF4D4F; margin-bottom: 4px;">
        第 ${item.line} 行：${item.reason}
      </div>
      <div style="font-size: 12px; color: #666; word-break: break-all; margin-top: 4px;">
        ${item.data}
      </div>
      ${item.fullResponse ? `<div style="font-size: 11px; color: #999; margin-top: 4px;">服务器响应: ${JSON.stringify(item.fullResponse)}</div>` : ''}
    </div>
  `).join('');

  showModal('导入错误详情', `
    <div style="margin-bottom: 16px;">
      <p style="color: #52C41A; font-weight: 600;">
        ✓ 成功导入 ${successCount} 道题目
      </p>
      <p style="color: #FF4D4F; font-weight: 600;">
        ✗ ${failedItems.length} 道题目导入失败
      </p>
    </div>
    <div style="max-height: 400px; overflow-y: auto; padding: 8px;">
      ${failedList}
    </div>
    <button id="close-error-report" class="btn btn-primary" style="width: 100%; margin-top: 16px;">
      关闭
    </button>
  `);

  document.getElementById('close-error-report').addEventListener('click', closeModal);
}

// ==================== 专题管理 ====================
async function loadTopicFilters() {
  const res = await apiRequest(`${API_BASE}/exams`);
  if (!res?.success) return;

  const options = res.data.map(exam =>
    `<option value="${exam._id}">${exam.name}</option>`
  ).join('');

  const select = document.getElementById('topic-exam-filter');
  if (select) {
    select.innerHTML = `<option value="">全部科目</option>${options}`;
  }
}

async function loadTopics() {
  const examId = document.getElementById('topic-exam-filter')?.value || '';
  const [topicsRes, examsRes] = await Promise.all([
    apiRequest(`${API_BASE}/admin/topics${examId ? `?examId=${examId}` : ''}`),
    apiRequest(`${API_BASE}/exams`)
  ]);
  if (!topicsRes?.success || !examsRes?.success) return;

  const examMap = new Map(examsRes.data.map(e => [e._id, e.name]));
  const topics = topicsRes.data || [];
  const topicMap = new Map(topics.map(t => [t._id, t.name]));

  const tbody = document.getElementById('topics-table-body');
  if (!tbody) return;
  tbody.innerHTML = topics.map(t => `
    <tr>
      <td>${t.name}</td>
      <td>${examMap.get(String(t.examId)) || '-'}</td>
      <td>${t.parentId ? (topicMap.get(String(t.parentId)) || '-') : '-'}</td>
      <td>${t.order || 0}</td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-sm btn-outline" onclick="editTopic('${t._id}')">编辑</button>
          <button class="btn btn-sm btn-danger" onclick="deleteTopic('${t._id}')">删除</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function showAddTopicModal() {
  showModal('添加专题', `
    <form id="topic-form">
      <div class="form-group">
        <label>科目 *</label>
        <select class="form-select" name="examId" required id="topic-exam-select">
          <option value="">请选择科目</option>
        </select>
      </div>
      <div class="form-group">
        <label>专题名称 *</label>
        <input type="text" class="form-control" name="name" required>
      </div>
      <div class="form-group">
        <label>上级专题</label>
        <select class="form-select" name="parentId" id="topic-parent-select">
          <option value="">无（一级专题）</option>
        </select>
      </div>
      <div class="form-group">
        <label>排序</label>
        <input type="number" class="form-control" name="order" value="0">
      </div>
      <button type="submit" class="btn btn-primary" style="width: 100%">提交</button>
    </form>
  `);

  Promise.all([
    apiRequest(`${API_BASE}/exams`),
    apiRequest(`${API_BASE}/admin/topics`)
  ]).then(([examsRes, topicsRes]) => {
    if (examsRes?.success) {
      const select = document.getElementById('topic-exam-select');
      select.innerHTML = '<option value="">请选择科目</option>' +
        examsRes.data.map(e => `<option value="${e._id}">${e.name}</option>`).join('');
    }
    if (topicsRes?.success) {
      const parentSelect = document.getElementById('topic-parent-select');
      parentSelect.innerHTML = '<option value="">无（一级专题）</option>' +
        topicsRes.data.map(t => `<option value="${t._id}">${t.name}</option>`).join('');
    }
  });

  document.getElementById('topic-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    if (!data.parentId) delete data.parentId;

    const res = await apiRequest(`${API_BASE}/admin/topics`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res?.success) {
      showToast('专题创建成功', 'success');
      closeModal();
      loadTopics();
    }
  });
}

async function editTopic(id) {
  const res = await apiRequest(`${API_BASE}/admin/topics`);
  if (!res?.success) return;
  const topic = res.data.find(t => t._id === id);
  if (!topic) return;

  showModal('编辑专题', `
    <form id="topic-form">
      <div class="form-group">
        <label>专题名称 *</label>
        <input type="text" class="form-control" name="name" value="${topic.name}" required>
      </div>
      <div class="form-group">
        <label>上级专题</label>
        <select class="form-select" name="parentId" id="topic-parent-select">
          <option value="">无（一级专题）</option>
        </select>
      </div>
      <div class="form-group">
        <label>排序</label>
        <input type="number" class="form-control" name="order" value="${topic.order || 0}">
      </div>
      <button type="submit" class="btn btn-primary" style="width: 100%">提交</button>
    </form>
  `);

  const parentSelect = document.getElementById('topic-parent-select');
  parentSelect.innerHTML = '<option value="">无（一级专题）</option>' +
    res.data.filter(t => t._id !== id).map(t => `<option value="${t._id}">${t.name}</option>`).join('');
  if (topic.parentId) parentSelect.value = String(topic.parentId);

  document.getElementById('topic-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    if (!data.parentId) data.parentId = null;

    const updateRes = await apiRequest(`${API_BASE}/admin/topics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    if (updateRes?.success) {
      showToast('专题更新成功', 'success');
      closeModal();
      loadTopics();
    }
  });
}

async function deleteTopic(id) {
  if (!confirm('确定要删除该专题吗？')) return;
  const res = await apiRequest(`${API_BASE}/admin/topics/${id}`, { method: 'DELETE' });
  if (res?.success) {
    showToast('专题已删除', 'success');
    loadTopics();
  }
}

// ==================== 真题管理 ====================
async function loadPaperFilters() {
  const res = await apiRequest(`${API_BASE}/exams`);
  if (!res?.success) return;
  const options = res.data.map(exam =>
    `<option value="${exam._id}">${exam.name}</option>`
  ).join('');
  const select = document.getElementById('paper-exam-filter');
  if (select) {
    select.innerHTML = `<option value="">全部科目</option>${options}`;
  }
}

async function loadPapers() {
  const examId = document.getElementById('paper-exam-filter')?.value || '';
  const [papersRes, examsRes] = await Promise.all([
    apiRequest(`${API_BASE}/admin/papers${examId ? `?examId=${examId}` : ''}`),
    apiRequest(`${API_BASE}/exams`)
  ]);
  if (!papersRes?.success || !examsRes?.success) return;

  const examMap = new Map(examsRes.data.map(e => [e._id, e.name]));
  const papers = papersRes.data || [];
  const tbody = document.getElementById('papers-table-body');
  if (!tbody) return;

  tbody.innerHTML = papers.map(p => `
    <tr>
      <td>${p.title}</td>
      <td>${p.year}</td>
      <td>${examMap.get(String(p.examId)) || '-'}</td>
      <td>${p.order || 0}</td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-sm btn-outline" onclick="editPaper('${p._id}')">编辑</button>
          <button class="btn btn-sm btn-danger" onclick="deletePaper('${p._id}')">删除</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function showAddPaperModal() {
  showModal('添加真题', `
    <form id="paper-form">
      <div class="form-group">
        <label>科目 *</label>
        <select class="form-select" name="examId" required id="paper-exam-select">
          <option value="">请选择科目</option>
        </select>
      </div>
      <div class="form-group">
        <label>真题名称 *</label>
        <input type="text" class="form-control" name="title" required>
      </div>
      <div class="form-group">
        <label>年份 *</label>
        <input type="number" class="form-control" name="year" required>
      </div>
      <div class="form-group">
        <label>排序</label>
        <input type="number" class="form-control" name="order" value="0">
      </div>
      <button type="submit" class="btn btn-primary" style="width: 100%">提交</button>
    </form>
  `);

  apiRequest(`${API_BASE}/exams`).then(res => {
    if (res?.success) {
      const select = document.getElementById('paper-exam-select');
      select.innerHTML = '<option value="">请选择科目</option>' +
        res.data.map(e => `<option value="${e._id}">${e.name}</option>`).join('');
    }
  });

  document.getElementById('paper-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    const res = await apiRequest(`${API_BASE}/admin/papers`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res?.success) {
      showToast('真题创建成功', 'success');
      closeModal();
      loadPapers();
    }
  });
}

async function editPaper(id) {
  const res = await apiRequest(`${API_BASE}/admin/papers`);
  if (!res?.success) return;
  const paper = res.data.find(p => p._id === id);
  if (!paper) return;

  showModal('编辑真题', `
    <form id="paper-form">
      <div class="form-group">
        <label>真题名称 *</label>
        <input type="text" class="form-control" name="title" value="${paper.title}" required>
      </div>
      <div class="form-group">
        <label>年份 *</label>
        <input type="number" class="form-control" name="year" value="${paper.year}" required>
      </div>
      <div class="form-group">
        <label>排序</label>
        <input type="number" class="form-control" name="order" value="${paper.order || 0}">
      </div>
      <button type="submit" class="btn btn-primary" style="width: 100%">提交</button>
    </form>
  `);

  document.getElementById('paper-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    const updateRes = await apiRequest(`${API_BASE}/admin/papers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    if (updateRes?.success) {
      showToast('真题更新成功', 'success');
      closeModal();
      loadPapers();
    }
  });
}

async function deletePaper(id) {
  if (!confirm('确定要删除该真题吗？')) return;
  const res = await apiRequest(`${API_BASE}/admin/papers/${id}`, { method: 'DELETE' });
  if (res?.success) {
    showToast('真题已删除', 'success');
    loadPapers();
  }
}

// ==================== 导入任务 ====================
async function loadImportTasks() {
  const res = await apiRequest(`${API_BASE}/admin/import/tasks`);
  if (!res?.success) return;

  const examsRes = await apiRequest(`${API_BASE}/exams`);
  const examMap = new Map((examsRes?.data || []).map(e => [e._id, e.name]));

  const tbody = document.getElementById('imports-table-body');
  if (!tbody) return;
  tbody.innerHTML = (res.data || []).map(t => `
    <tr>
      <td><code>${t._id}</code></td>
      <td>${examMap.get(String(t.examId)) || '-'}</td>
      <td>${t.status || '-'}</td>
      <td>${t.createdAt ? new Date(t.createdAt).toLocaleString('zh-CN') : '-'}</td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-sm btn-outline" onclick="viewImportTask('${t._id}')">查看</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function showCreateImportTaskModal() {
  showModal('创建导入任务', `
    <form id="import-task-form">
      <div class="form-group">
        <label>科目</label>
        <select class="form-select" name="examId" id="import-task-exam-select">
          <option value="">请选择科目</option>
        </select>
      </div>
      <div class="form-group">
        <label>原始文本（可选）</label>
        <textarea class="form-control" name="rawText" rows="6"></textarea>
      </div>
      <button type="submit" class="btn btn-primary" style="width: 100%">提交</button>
    </form>
  `);

  apiRequest(`${API_BASE}/exams`).then(res => {
    if (res?.success) {
      const select = document.getElementById('import-task-exam-select');
      select.innerHTML = '<option value="">请选择科目</option>' +
        res.data.map(e => `<option value="${e._id}">${e.name}</option>`).join('');
    }
  });

  document.getElementById('import-task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    const payload = { examId: data.examId || undefined, rawText: data.rawText || '' };

    const res = await apiRequest(`${API_BASE}/admin/import/upload`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res?.success) {
      showToast('导入任务已创建', 'success');
      closeModal();
      loadImportTasks();
    }
  });
}

async function viewImportTask(id) {
  const res = await apiRequest(`${API_BASE}/admin/import/tasks/${id}`);
  if (!res?.success) return;
  const task = res.data;
  showModal('导入任务详情', `
    <div style="font-size: 13px;">
      <p><strong>任务ID：</strong>${task._id}</p>
      <p><strong>状态：</strong>${task.status}</p>
      <p><strong>科目：</strong>${task.examId || '-'}</p>
      <p><strong>创建时间：</strong>${task.createdAt ? new Date(task.createdAt).toLocaleString('zh-CN') : '-'}</p>
      <pre style="white-space: pre-wrap; background: #f7f7f7; padding: 12px; border-radius: 6px;">${JSON.stringify(task.result || task.validation || {}, null, 2)}</pre>
    </div>
  `);
}

// ==================== 激活码管理 ====================
async function loadCodeFilters() {
  const res = await apiRequest(`${API_BASE}/exams`);
  if (!res?.success) return;

  const options = res.data.map(exam =>
    `<option value="${exam._id}">${exam.name}</option>`
  ).join('');

  document.getElementById('code-exam-filter').innerHTML = `<option value="">全部科目</option>${options}`;
}

async function loadCodes() {
  const examId = document.getElementById('code-exam-filter').value;
  let url = `${API_BASE}/admin/codes`;
  if (examId) url += `?examId=${examId}`;

  const res = await apiRequest(url);
  if (!res?.success) return;

  const tbody = document.getElementById('codes-table-body');
  tbody.innerHTML = res.data.map(code => `
    <tr>
      <td><code>${code.code}</code></td>
      <td>${code.examId?.name || '-'}</td>
      <td>
        <span class="badge ${code.isUsed ? 'badge-danger' : 'badge-success'}">
          ${code.isUsed ? '已使用' : '未使用'}
        </span>
      </td>
      <td>${code.usedAt ? new Date(code.usedAt).toLocaleString('zh-CN') : '-'}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteCode('${code._id}')">删除</button>
      </td>
    </tr>
  `).join('');
}

function showGenerateCodesModal() {
  showModal('生成激活码', `
    <div class="form-group">
      <label>选择科目 *</label>
      <select class="form-select" id="generate-exam-select" required>
        <option value="">请选择科目</option>
      </select>
    </div>
    <div class="form-group">
      <label>生成数量 *</label>
      <input type="number" class="form-control" id="generate-count" value="10" min="1" max="100">
    </div>
    <button id="do-generate" class="btn btn-primary" style="width: 100%">生成</button>
  `);

  // 填充科目选项
  apiRequest(`${API_BASE}/exams`).then(res => {
    if (res?.success) {
      const select = document.getElementById('generate-exam-select');
      select.innerHTML = '<option value="">请选择科目</option>' +
        res.data.map(e => `<option value="${e._id}">${e.name}</option>`).join('');
    }
  });

  document.getElementById('do-generate').addEventListener('click', async () => {
    const examId = document.getElementById('generate-exam-select').value;
    const count = parseInt(document.getElementById('generate-count').value);

    if (!examId || !count || count < 1 || count > 100) {
      showToast('请填写正确的信息', 'error');
      return;
    }

    console.log('正在生成激活码...', { examId, count });

    const res = await apiRequest(`${API_BASE}/admin/codes/generate`, {
      method: 'POST',
      body: JSON.stringify({ examId, count })
    });

    console.log('生成激活码响应:', res);

    if (res?.success) {
      showCodesResult(res.data);
    } else {
      showToast(res?.message || '生成激活码失败，请检查网络连接', 'error');
      console.error('生成激活码失败:', res);
    }
  });
}

function showCodesResult(codes) {
  showModal('激活码生成成功', `
    <p style="margin-bottom: 16px">已生成 <strong>${codes.length}</strong> 个激活码：</p>
    <div class="code-list">
      ${codes.map((c, index) => `
        <div class="code-item">
          <span>${c.code}</span>
          <span class="code-copy" data-code="${c.code}" data-index="${index}">复制</span>
        </div>
      `).join('')}
    </div>
    <button id="copy-all" class="btn btn-primary" style="width: 100%; margin-top: 16px">复制全部</button>
  `);

  // 绑定单个复制按钮
  document.querySelectorAll('.code-copy').forEach(btn => {
    btn.addEventListener('click', async () => {
      const code = btn.getAttribute('data-code');
      try {
        await navigator.clipboard.writeText(code);
        btn.textContent = '已复制!';
        setTimeout(() => {
          btn.textContent = '复制';
        }, 2000);
      } catch (err) {
        // 备用方案：使用传统方法
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          btn.textContent = '已复制!';
          setTimeout(() => {
            btn.textContent = '复制';
          }, 2000);
        } catch (e) {
          showToast('复制失败，请手动复制', 'error');
        }
        document.body.removeChild(textArea);
      }
    });
  });

  // 绑定复制全部按钮
  document.getElementById('copy-all').addEventListener('click', async () => {
    const allCodes = codes.map(c => c.code).join('\n');
    try {
      await navigator.clipboard.writeText(allCodes);
      showToast('已复制全部激活码到剪贴板', 'success');
    } catch (err) {
      // 备用方案
      const textArea = document.createElement('textarea');
      textArea.value = allCodes;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        showToast('已复制全部激活码到剪贴板', 'success');
      } catch (e) {
        showToast('复制失败，请手动复制', 'error');
      }
      document.body.removeChild(textArea);
    }
  });
}

async function deleteCode(id) {
  if (!confirm('确定要删除这个激活码吗？')) return;

  const res = await apiRequest(`${API_BASE}/admin/codes/${id}`, {
    method: 'DELETE'
  });

  if (res?.success) {
    showToast('激活码删除成功', 'success');
    loadCodes();
  }
}

// ==================== 用户管理 ====================
async function loadUsers() {
  const res = await apiRequest(`${API_BASE}/permissions`);
  if (!res?.success) return;

  // 按用户ID分组
  const userMap = new Map();
  res.data.forEach(p => {
    if (!userMap.has(p.userId)) {
      userMap.set(p.userId, {
        userId: p.userId,
        exams: [],
        activatedAt: p.activatedAt
      });
    }
    userMap.get(p.userId).exams.push(p.examId?.name || '-');
  });

  const tbody = document.getElementById('users-table-body');
  tbody.innerHTML = Array.from(userMap.values()).map(user => `
    <tr>
      <td><code>${user.userId}</code></td>
      <td>${user.exams.join(', ')}</td>
      <td>${user.activatedAt ? new Date(user.activatedAt).toLocaleString('zh-CN') : '-'}</td>
    </tr>
  `).join('');
}

// ==================== 模态框 ====================
function showModal(title, content) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = content;
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

// ==================== 提示消息 ====================
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}
