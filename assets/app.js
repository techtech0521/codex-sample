const STORAGE_KEY = 'study-log:learning-logs';
const categories = ['英語', 'プログラミング', '資格', '読書'];

function getLearningLogs() {
  const rawLogs = window.localStorage.getItem(STORAGE_KEY);
  if (!rawLogs) return [];

  try {
    const logs = JSON.parse(rawLogs);
    return Array.isArray(logs) ? logs : [];
  } catch {
    return [];
  }
}

function saveLearningLog(input) {
  const now = new Date().toISOString();
  const log = {
    ...input,
    id: window.crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  const logs = getLearningLogs();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([log, ...logs]));
  return log;
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}時間 ${rest}分` : `${rest}分`;
}

function renderLogsPage() {
  const list = document.querySelector('[data-log-list]');
  if (!list) return;

  const logs = [...getLearningLogs()].sort((a, b) => b.date.localeCompare(a.date));
  if (logs.length === 0) {
    list.innerHTML = '<p>まだ学習ログがありません。最初のログを登録しましょう。</p><a href="/logs/new/">学習ログを登録する</a>';
    return;
  }

  list.innerHTML = logs.map((log) => `
    <article class="log-item">
      <p class="meta">${escapeHtml(log.date)} / ${escapeHtml(log.category)} / ${formatDuration(Number(log.durationMinutes))}</p>
      <h2>${escapeHtml(log.title)}</h2>
      ${log.memo ? `<p>${escapeHtml(log.memo)}</p>` : ''}
    </article>
  `).join('');
}

function setupNewLogForm() {
  const form = document.querySelector('[data-log-form]');
  if (!form) return;

  const dateInput = form.elements.date;
  dateInput.value = new Date().toISOString().slice(0, 10);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearErrors(form);

    const values = {
      date: form.elements.date.value,
      title: form.elements.title.value.trim(),
      category: form.elements.category.value.trim(),
      durationMinutes: Number(form.elements.durationMinutes.value),
      memo: form.elements.memo.value.trim(),
    };
    const errors = validateLog(values);

    if (Object.keys(errors).length > 0) {
      showErrors(errors);
      return;
    }

    try {
      saveLearningLog({
        ...values,
        memo: values.memo || undefined,
      });
      window.location.href = '/logs/';
    } catch (error) {
      const message = error instanceof Error ? error.message : '学習ログの登録に失敗しました。';
      document.querySelector('[data-submit-error]').textContent = message;
      document.querySelector('[data-submit-error]').hidden = false;
    }
  });
}

function validateLog(values) {
  const errors = {};
  if (!values.date) errors.date = '学習日は必須です。';
  if (!values.title) errors.title = 'タイトルは必須です。';
  if (!values.category) errors.category = 'カテゴリは必須です。';
  if (!Number.isInteger(values.durationMinutes) || values.durationMinutes < 1) {
    errors.durationMinutes = '学習時間は1分以上の整数で入力してください。';
  }
  return errors;
}

function clearErrors(form) {
  form.querySelectorAll('[data-error-for]').forEach((node) => {
    node.textContent = '';
  });
  const submitError = document.querySelector('[data-submit-error]');
  if (submitError) {
    submitError.textContent = '';
    submitError.hidden = true;
  }
}

function showErrors(errors) {
  Object.entries(errors).forEach(([name, message]) => {
    const node = document.querySelector(`[data-error-for="${name}"]`);
    if (node) node.textContent = message;
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[char]));
}

setupNewLogForm();
renderLogsPage();
