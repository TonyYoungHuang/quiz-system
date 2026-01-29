// 全局变量
let currentToken = localStorage.getItem('adminToken') || '';
let currentPage = 1;
let pageSize = 20;
let totalCodes = 0;
let app = null;

// 初始化 Cloudbase
async function initCloudbase() {
  try {
    app = tcb.init({ env: 'cloud1-0g8twq2fde2fa6f0' });
    const auth = app.auth();
    const loginState = await auth.getLoginState();
    if (!loginState) {
      await auth.anonymousAuthProvider().signIn();
    }
    console.log('Cloudbase 初始化成功');
  } catch (err) {
    console.error('Cloudbase 初始化失败：', err);
    showToast('云环境初始化失败：' + err.message, 'error');
  }
}

// 页面加载时初始化
window.onload = async function() {
  await initCloudbase();
  if (currentToken) {
    showMainPage();
  }
};

// 显示提示消息
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast toast-${type} show`;
  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

// 登录
async function login() {
  const password = document.getElementById('loginPassword').value;
  if (!password) {
    showToast('请输入密码', 'error');
    return;
  }

  try {
    const result = await callCloudFunction('adminLogin', { password });
    if (result.success) {
      currentToken = result.data.token;
      localStorage.setItem('adminToken', currentToken);
      showMainPage();
      showToast('登录成功');
    } else {
      showToast(result.message, 'error');
    }
  } catch (error) {
    showToast('登录失败：' + error.message, 'error');
  }
}

// 退出登录
function logout() {
  currentToken = '';
  localStorage.removeItem('adminToken');
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('mainPage').style.display = 'none';
  document.getElementById('loginPassword').value = '';
}

// 显示主页面
async function showMainPage() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('mainPage').style.display = 'block';
  await loadStats();
  await loadExams();
  await loadExamSelects();
}

// 加载统计数据
async function loadStats() {
  try {
    const result = await callCloudFunction('adminGetStats', { token: currentToken });
    if (result.success) {
      const data = result.data;
      document.getElementById('statExams').textContent = data.examCount;
      document.getElementById('statQuestions').textContent = data.questionCount;
      document.getElementById('statCodes').textContent = data.codeCount;
      document.getElementById('statUsers').textContent = data.userPermissionCount;
    }
  } catch (error) {
    console.error('加载统计数据失败', error);
  }
}

// 加载科目列表
async function loadExams() {
  try {
    const result = await callCloudFunction('adminGetExams', { token: currentToken });
    if (result.success) {
      const exams = result.data;
      const tbody = document.getElementById('examsTableBody');
      tbody.innerHTML = exams.map(exam => `
        <tr>
          <td>${exam.icon}</td>
          <td>${exam.name}</td>
          <td>${exam.category}</td>
          <td>${exam.questionCount}</td>
          <td>${exam.sortOrder}</td>
          <td>
            <button class="btn-sm btn-danger" onclick="deleteExam('${exam._id}')">删除</button>
          </td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('加载科目列表失败', error);
  }
}

// 加载科目选择器
async function loadExamSelects() {
  try {
    const result = await callCloudFunction('adminGetExams', { token: currentToken });
    if (result.success) {
      const exams = result.data;
      const options = exams.map(exam => `<option value="${exam._id}">${exam.name}</option>`).join('');
      document.getElementById('importExamSelect').innerHTML = '<option value="">请选择科目</option>' + options;
      document.getElementById('generateExamSelect').innerHTML = '<option value="">请选择科目</option>' + options;
      document.getElementById('filterExamSelect').innerHTML = '<option value="">全部科目</option>' + options;
    }
  } catch (error) {
    console.error('加载科目选择器失败', error);
  }
}

// 显示页面
function showPage(pageName) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));

  document.getElementById(pageName + 'Page').classList.add('active');
  const evt = window.event;
  if (evt && evt.target) {
    const item = evt.target.closest('.sidebar-item');
    if (item) item.classList.add('active');
  }

  if (pageName === 'codes') {
    loadCodes();
  }
}

// 显示添加科目模态框
function showCreateExamModal() {
  document.getElementById('createExamModal').classList.add('active');
}

// 创建科目
async function createExam() {
  const name = document.getElementById('examName').value.trim();
  const category = document.getElementById('examCategory').value.trim();
  const icon = document.getElementById('examIcon').value.trim();
  const sortOrder = parseInt(document.getElementById('examSortOrder').value) || 0;

  if (!name) {
    showToast('请输入科目名称', 'error');
    return;
  }

  try {
    const result = await callCloudFunction('adminCreateExam', {
      token: currentToken,
      name,
      category,
      icon,
      sortOrder
    });

    if (result.success) {
      showToast('科目创建成功');
      closeModal('createExamModal');
      document.getElementById('examName').value = '';
      await loadExams();
      await loadExamSelects();
      await loadStats();
    } else {
      showToast(result.message, 'error');
    }
  } catch (error) {
    showToast('创建失败：' + error.message, 'error');
  }
}

// 删除科目
async function deleteExam(examId) {
  if (!confirm('确定要删除这个科目吗？相关的题目和激活码也将被删除。')) {
    return;
  }

  try {
    const result = await callCloudFunction('adminDeleteExam', { token: currentToken, examId });
    if (result.success) {
      showToast('删除成功');
      await loadExams();
      await loadExamSelects();
      await loadStats();
    } else {
      showToast(result.message, 'error');
    }
  } catch (error) {
    showToast('删除失败：' + error.message, 'error');
  }
}

// 显示导入模态框
function showImportModal() {
  document.getElementById('importModal').classList.add('active');
  document.getElementById('importResult').style.display = 'none';
}

// 导入题目
async function importQuestions() {
  const examId = document.getElementById('importExamSelect').value;
  const csvData = document.getElementById('importData').value.trim();

  if (!examId) {
    showToast('请选择科目', 'error');
    return;
  }

  if (!csvData) {
    showToast('请输入CSV数据', 'error');
    return;
  }

  const lines = csvData.split('\n').filter(line => line.trim());
  const questions = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = parseCSVLine(line);

    if (parts.length < 7) {
      console.warn(`第 ${i + 1} 行格式不正确，已跳过:`, line);
      continue;
    }

    let type = parts[0].trim();
    const content = parts[1].trim();
    const optionA = parts[2].trim();
    const optionB = parts[3].trim();
    const optionC = parts[4].trim();
    const optionD = parts[5].trim();
    const answer = parts[6].trim();
    const explanation = parts[7] ? parts[7].trim() : '';

    if (type.includes('多选')) {
      type = 'MULTI';
    } else if (type.includes('判断')) {
      type = 'JUDGE';
    } else {
      type = 'SINGLE';
    }

    const options = { A: optionA, B: optionB, C: optionC, D: optionD };

    questions.push({
      type,
      content,
      options,
      answer,
      explanation,
      sortOrder: i
    });
  }

  if (questions.length === 0) {
    showToast('没有有效的题目数据', 'error');
    return;
  }

  try {
    const result = await callCloudFunction('adminImportQuestions', {
      token: currentToken,
      examId,
      questions
    });

    if (result.success) {
      const { successCount, failCount, errors } = result.data;

      let resultHtml = `<p><strong>导入完成！</strong></p>`;
      resultHtml += `<p>成功：${successCount} 条</p>`;
      resultHtml += `<p>失败：${failCount} 条</p>`;

      if (errors.length > 0) {
        resultHtml += `<p><strong>失败详情：</strong></p>`;
        resultHtml += `<ul>`;
        errors.slice(0, 10).forEach(err => {
          resultHtml += `<li>${err.question}: ${err.error}</li>`;
        });
        if (errors.length > 10) {
          resultHtml += `<li>...还有 ${errors.length - 10} 条</li>`;
        }
        resultHtml += `</ul>`;
      }

      document.getElementById('importResult').innerHTML = resultHtml;
      document.getElementById('importResult').style.display = 'block';

      showToast('导入完成');

      if (successCount > 0) {
        await loadStats();
      }
    } else {
      showToast(result.message, 'error');
    }
  } catch (error) {
    showToast('导入失败：' + error.message, 'error');
  }
}

// 解析CSV行
function parseCSVLine(line) {
  const parts = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);

  return parts;
}

// 显示生成激活码模态框
function showGenerateModal() {
  document.getElementById('generateModal').classList.add('active');
  document.getElementById('generatedCodes').style.display = 'none';
  document.getElementById('generatedCodesList').innerHTML = '';
}

// 生成激活码
async function generateCodes() {
  const examId = document.getElementById('generateExamSelect').value;
  const count = parseInt(document.getElementById('generateCount').value) || 10;
  const source = document.getElementById('generateSource').value;

  if (!examId) {
    showToast('请选择科目', 'error');
    return;
  }

  if (count < 1 || count > 100) {
    showToast('生成数量必须在1-100之间', 'error');
    return;
  }

  try {
    const result = await callCloudFunction('adminGenerateCodes', {
      token: currentToken,
      examId,
      count,
      source
    });

    if (result.success) {
      const codes = result.data.codes;
      document.getElementById('generatedCodesList').innerHTML = codes.map(code =>
        `<div class="code-item"><span>${code}</span><button class="btn-sm btn-secondary" onclick="copyCode('${code}')">复制</button></div>`
      ).join('');
      document.getElementById('generatedCodes').style.display = 'block';

      showToast(`成功生成 ${count} 个激活码`);
      await loadStats();
      await loadCodes();
    } else {
      showToast(result.message, 'error');
    }
  } catch (error) {
    showToast('生成失败：' + error.message, 'error');
  }
}

// 复制单个激活码
function copyCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    showToast('已复制');
  });
}

// 复制全部激活码
function copyCodes() {
  const codes = document.getElementById('generatedCodesList').innerText;
  navigator.clipboard.writeText(codes).then(() => {
    showToast('已复制全部');
  });
}

// 加载激活码列表
async function loadCodes() {
  try {
    const examId = document.getElementById('filterExamSelect').value;
    const offset = (currentPage - 1) * pageSize;

    const result = await callCloudFunction('adminGetCodes', {
      token: currentToken,
      examId,
      limit: pageSize,
      offset
    });

    if (result.success) {
      const { list, total } = result.data;
      totalCodes = total;

      const tbody = document.getElementById('codesTableBody');
      tbody.innerHTML = list.map(code => `
        <tr>
          <td style="font-family: monospace;">${code.code}</td>
          <td>${code.examName}</td>
          <td>${code.source}</td>
          <td>${code.isUsed ? '<span style="color: #10b981;">已使用</span>' : '<span style="color: #f59e0b;">未使用</span>'}</td>
          <td>${new Date(code.createdAt).toLocaleString()}</td>
          <td>
            ${!code.isUsed ? `<button class="btn-sm btn-danger" onclick="deleteCode('${code._id}')">删除</button>` : '-'}
          </td>
        </tr>
      `).join('');

      document.getElementById('paginationInfo').textContent = `${currentPage} / ${Math.ceil(total / pageSize) || 1}`;
      document.getElementById('prevBtn').disabled = currentPage === 1;
      document.getElementById('nextBtn').disabled = currentPage >= Math.ceil(total / pageSize);
    }
  } catch (error) {
    console.error('加载激活码列表失败', error);
  }
}

// 删除激活码
async function deleteCode(codeId) {
  if (!confirm('确定要删除这个激活码吗？')) {
    return;
  }

  try {
    const result = await callCloudFunction('adminDeleteCode', { token: currentToken, codeId });
    if (result.success) {
      showToast('删除成功');
      await loadCodes();
      await loadStats();
    } else {
      showToast(result.message, 'error');
    }
  } catch (error) {
    showToast('删除失败：' + error.message, 'error');
  }
}

// 上一页
function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    loadCodes();
  }
}

// 下一页
function nextPage() {
  if (currentPage < Math.ceil(totalCodes / pageSize)) {
    currentPage++;
    loadCodes();
  }
}

// 关闭模态框
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// 调用云函数
async function callCloudFunction(name, data) {
  if (!app) {
    throw new Error('Cloudbase 未初始化');
  }
  try {
    const result = await app.callFunction({
      name: name,
      data: data
    });
    return result.result;
  } catch (err) {
    throw err;
  }
}

// 键盘事件
document.getElementById('loginPassword').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    login();
  }
});
