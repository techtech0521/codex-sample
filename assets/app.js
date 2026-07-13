const STORAGE_KEY = 'study-log:learning-logs';
const categories = ['英語', 'プログラミング', '資格', '読書'];

function readLearningLogs() {
  const rawLogs = window.localStorage.getItem(STORAGE_KEY);
  if (!rawLogs) return [];

  const logs = JSON.parse(rawLogs);
  if (!Array.isArray(logs)) {
    throw new Error('保存されている学習ログの形式が正しくありません。');
  }
  return logs;
}

function getLearningLogs() {
  try {
    return readLearningLogs();
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

function updateLearningLog(id, input) {
  const logs = getLearningLogs();
  const index = logs.findIndex((log) => log.id === id);
  if (index === -1) {
    throw new Error('編集対象の学習ログが見つかりません。');
  }

  const updatedLog = {
    ...logs[index],
    ...input,
    id,
    updatedAt: new Date().toISOString(),
  };
  logs[index] = updatedLog;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  return updatedLog;
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}時間 ${rest}分` : `${rest}分`;
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}

function getMemoExcerpt(memo, maxLength = 80) {
  if (!memo) return 'メモはありません。';
  const normalizedMemo = String(memo).replace(/\s+/g, ' ').trim();
  return normalizedMemo.length > maxLength
    ? `${normalizedMemo.slice(0, maxLength)}…`
    : normalizedMemo;
}

function renderLogsPage() {
  const list = document.querySelector('[data-log-list]');
  if (!list) return;

  const loading = document.querySelector('[data-log-loading]');
  const error = document.querySelector('[data-log-error]');
  const count = document.querySelector('[data-log-count]');

  list.innerHTML = '';
  list.hidden = true;
  if (error) {
    error.hidden = true;
    error.textContent = '';
  }
  if (count) count.textContent = '';
  if (loading) loading.hidden = false;

  window.setTimeout(() => {
    try {
      const logs = [...readLearningLogs()].sort((a, b) => {
        const dateCompare = String(b.date).localeCompare(String(a.date));
        if (dateCompare !== 0) return dateCompare;
        return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      });

      if (loading) loading.hidden = true;
      list.hidden = false;

      if (logs.length === 0) {
        list.innerHTML = `
          <div class="empty-state">
            <p>まだ学習ログがありません</p>
            <a class="button" href="/logs/new/">学習ログを登録する</a>
          </div>
        `;
        return;
      }

      if (count) count.textContent = `${logs.length}件の学習ログを表示しています。`;
      list.innerHTML = logs.map((log) => `
        <a class="log-item log-link" href="/logs/new/?id=${encodeURIComponent(log.id)}" aria-label="${escapeHtml(log.title)}を編集する">
          <div class="log-item-header">
            <p class="meta">${escapeHtml(formatDate(log.date))}</p>
            <span class="category-badge">${escapeHtml(log.category)}</span>
          </div>
          <h2>${escapeHtml(log.title)}</h2>
          <dl class="log-summary">
            <div>
              <dt>学習時間</dt>
              <dd>${escapeHtml(formatDuration(Number(log.durationMinutes)))}</dd>
            </div>
            <div>
              <dt>メモ</dt>
              <dd>${escapeHtml(getMemoExcerpt(log.memo))}</dd>
            </div>
          </dl>
        </a>
      `).join('');
    } catch (caughtError) {
      if (loading) loading.hidden = true;
      list.hidden = true;
      if (error) {
        const message = caughtError instanceof Error ? caughtError.message : '学習ログの読み込みに失敗しました。';
        error.textContent = message;
        error.hidden = false;
      }
    }
  }, 0);
}

function setupNewLogForm() {
  const form = document.querySelector('[data-log-form]');
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const editingId = params.get('id');
  const dateInput = form.elements.date;
  const heading = document.querySelector('[data-form-title]');
  const description = document.querySelector('[data-form-description]');
  const submitButton = form.querySelector('[data-submit-button]');

  dateInput.value = new Date().toISOString().slice(0, 10);

  if (editingId) {
    const editingLog = getLearningLogs().find((log) => log.id === editingId);
    if (editingLog) {
      if (heading) heading.textContent = '学習ログ編集';
      if (description) description.textContent = '登録済みの学習ログを編集できます。';
      if (submitButton) submitButton.textContent = '更新する';
      form.elements.date.value = editingLog.date || '';
      form.elements.title.value = editingLog.title || '';
      form.elements.category.value = editingLog.category || categories[0];
      form.elements.durationMinutes.value = editingLog.durationMinutes || 30;
      form.elements.memo.value = editingLog.memo || '';
    }
  }

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
      const payload = {
        ...values,
        memo: values.memo || undefined,
      };
      if (editingId) {
        updateLearningLog(editingId, payload);
      } else {
        saveLearningLog(payload);
      }
      window.location.href = '/logs/';
    } catch (error) {
      const message = error instanceof Error ? error.message : '学習ログの保存に失敗しました。';
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
