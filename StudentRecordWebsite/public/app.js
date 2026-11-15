const rows = document.getElementById('studentRows');
const searchInput = document.getElementById('searchInput');
const modal = document.getElementById('studentModal');
const form = document.getElementById('studentForm');
const formError = document.getElementById('formError');
const notice = document.getElementById('notice');
const emptyState = document.getElementById('emptyState');
let students = [];
let editingRoll = null;
let noticeTimer;

const byId = id => document.getElementById(id);
const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
  return data;
}

function showNotice(message, type = 'success') {
  clearTimeout(noticeTimer);
  notice.textContent = message;
  notice.className = `notice ${type}`;
  notice.hidden = false;
  noticeTimer = setTimeout(() => { notice.hidden = true; }, 4500);
}

function performanceFor(marks) {
  if (marks >= 75) return ['Excellent', 'good'];
  if (marks >= 40) return ['Average', 'average'];
  return ['Needs support', 'low'];
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = students.filter(s => String(s.rollNo).includes(query) || s.name.toLowerCase().includes(query));
  rows.innerHTML = filtered.map(s => {
    const [label, cls] = performanceFor(Number(s.marks));
    return `<tr>
      <td><span class="roll-badge">#${s.rollNo}</span></td>
      <td><span class="student-name">${escapeHtml(s.name)}</span></td>
      <td><span class="mark-number">${Number(s.marks).toFixed(1).replace(/\.0$/, '')}</span> / 100</td>
      <td><div class="progress-cell"><div class="progress-track"><div class="progress-fill" style="width:${Number(s.attendance)}%"></div></div><span>${Number(s.attendance).toFixed(1).replace(/\.0$/, '')}%</span></div></td>
      <td><span class="performance ${cls}">${label}</span></td>
      <td><div class="actions"><button class="action-btn" data-edit="${s.rollNo}">Edit</button><button class="action-btn delete" data-delete="${s.rollNo}">Delete</button></div></td>
    </tr>`;
  }).join('');
  byId('totalStudents').textContent = students.length;
  byId('averageMarks').textContent = students.length ? (students.reduce((sum, s) => sum + Number(s.marks), 0) / students.length).toFixed(1) : '—';
  byId('averageAttendance').textContent = students.length ? (students.reduce((sum, s) => sum + Number(s.attendance), 0) / students.length).toFixed(1) + '%' : '—';
  byId('recordCount').textContent = `${filtered.length} ${filtered.length === 1 ? 'record' : 'records'}`;
  emptyState.classList.toggle('show', filtered.length === 0);
  emptyState.querySelector('h3').textContent = students.length && query ? 'No matching students' : 'No student records yet';
  emptyState.querySelector('p').textContent = students.length && query ? 'Try another name or roll number.' : 'Add your first student to get started.';
  byId('emptyAddBtn').style.display = students.length && query ? 'none' : '';
}

async function refresh(showMessage = false) {
  try {
    students = await api('/api/students');
    render();
    if (showMessage) showNotice('Student records loaded successfully.');
  } catch (error) {
    showNotice(`${error.message} Make sure the C++ server is running.`, 'error');
  }
}

function openModal(student = null) {
  editingRoll = student ? Number(student.rollNo) : null;
  form.reset();
  formError.hidden = true;
  byId('modalTitle').textContent = student ? 'Edit student' : 'Add student';
  byId('rollNo').disabled = Boolean(student);
  byId('rollHelp').textContent = student ? 'Roll number cannot be changed while editing.' : 'Roll number must be unique.';
  byId('saveBtn').textContent = student ? 'Save changes' : 'Save student';
  if (student) {
    byId('rollNo').value = student.rollNo;
    byId('name').value = student.name;
    byId('marks').value = student.marks;
    byId('attendance').value = student.attendance;
  }
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => byId('name').focus(), 30);
}

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = '';
  editingRoll = null;
  byId('rollNo').disabled = false;
}

async function submitStudent(event) {
  event.preventDefault();
  formError.hidden = true;
  const rollNo = Number(byId('rollNo').value);
  const name = byId('name').value.trim();
  const marks = Number(byId('marks').value);
  const attendance = Number(byId('attendance').value);

  if (!Number.isInteger(rollNo) || rollNo <= 0) return setFormError('Roll number must be a positive whole number.');
  if (!name) return setFormError('Please enter the student name.');
  if (name.includes(',')) return setFormError('Names cannot contain commas.');
  if (name.length > 80) return setFormError('Name must be 80 characters or fewer.');
  if (!Number.isFinite(marks) || marks < 0 || marks > 100) return setFormError('Marks must be between 0 and 100.');
  if (!Number.isFinite(attendance) || attendance < 0 || attendance > 100) return setFormError('Attendance must be between 0 and 100.');
  const duplicate = students.some(s => Number(s.rollNo) === rollNo && Number(s.rollNo) !== editingRoll);
  if (duplicate) return setFormError('That roll number already exists.');

  const payload = { name, marks, attendance };
  if (!editingRoll) payload.rollNo = rollNo;
  try {
    await api(editingRoll ? `/api/students/${editingRoll}` : '/api/students', {
      method: editingRoll ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
    closeModal();
    await refresh();
    showNotice(editingRoll ? 'Student details updated.' : 'Student added successfully.');
  } catch (error) { setFormError(error.message); }
}

function setFormError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

async function deleteStudent(rollNo) {
  const student = students.find(s => Number(s.rollNo) === Number(rollNo));
  if (!student || !confirm(`Delete ${student.name} (roll no. ${student.rollNo})? This cannot be undone.`)) return;
  try {
    await api(`/api/students/${rollNo}`, { method: 'DELETE' });
    await refresh();
    showNotice('Student record deleted.');
  } catch (error) { showNotice(error.message, 'error'); }
}

document.querySelectorAll('#addTopBtn,#addRecordBtn,#emptyAddBtn').forEach(btn => btn.addEventListener('click', () => openModal()));
byId('closeModalBtn').addEventListener('click', closeModal);
byId('cancelBtn').addEventListener('click', closeModal);
modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.hidden) closeModal(); });
form.addEventListener('submit', submitStudent);
searchInput.addEventListener('input', render);
rows.addEventListener('click', event => {
  const editBtn = event.target.closest('[data-edit]');
  const deleteBtn = event.target.closest('[data-delete]');
  if (editBtn) {
    const student = students.find(s => Number(s.rollNo) === Number(editBtn.dataset.edit));
    if (student) openModal(student);
  }
  if (deleteBtn) deleteStudent(deleteBtn.dataset.delete);
});
refresh();
