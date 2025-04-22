let students = [], subjects = [], grades = [];

async function fetchData() {
  const [studentsRes, subjectsRes, gradesRes] = await Promise.all([
    fetch("http://localhost:8081/api/students/"),
    fetch("http://localhost:8081/api/subjects/"),
    fetch("http://localhost:8081/api/grades/"),
  ]);
  students = await studentsRes.json();
  subjects = await subjectsRes.json();
  grades = await gradesRes.json();

  populateSubjectFilter();
  renderTable();
}

function populateSubjectFilter() {
  const sel = document.getElementById('filter-subject');
  sel.innerHTML = '<option value="">Fan tanlang</option>';
  subjects.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    sel.appendChild(opt);
  });
}

async function addStudent() {
  const name = document.getElementById('new-student').value;
  if (!name) return;
  await fetch("http://localhost:8081/api/students/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  document.getElementById('new-student').value = '';
  fetchData();
}

async function addSubject() {
  const name = document.getElementById('new-subject').value;
  if (!name) return;
  await fetch("http://localhost:8081/api/subjects/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  document.getElementById('new-subject').value = '';
  fetchData();
}
async function updateGrade(gradeId, studentId, subjectId, score) {
  await fetch(`http://localhost:8000/api/grades/${gradeId}/`, {
    method: "PUT",  // PUT metodini ishlatish
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      student_id: studentId,
      subject_id: subjectId,
      score: score
    })
  });
  fetchData();  // Ma'lumotlarni qayta yuklash
}

  input.addEventListener('change', () => {
    const val = parseInt(input.value);
    if (val >= 0 && val <= 100) {
      updateGrade(student.id, subject.id, val);
    } else {
      console.error('Invalid grade value');
    }
  });
  

function getColor(score) {
  let r = 255, g = 255;
  if (score < 50) {
    r = 255;
    g = Math.floor((score / 50) * 255);
  } else {
    g = 255;
    r = Math.floor(255 - ((score - 50) / 50) * 255);
  }
  return `rgb(${r}, ${g}, 0)`;
}

function applyFilter() {
  renderTable(true);
}

function clearFilter() {
  document.querySelectorAll('input[name="grade-filter"]').forEach(r => r.checked = false);
  document.getElementById('filter-subject').value = '';
  renderTable();
}

function renderTable(applyFiltering = false) {
  const head = document.getElementById('table-head');
  const body = document.getElementById('table-body');
  const foot = document.getElementById('table-foot');
  head.innerHTML = body.innerHTML = foot.innerHTML = '';

  const header = document.createElement('tr');
  header.innerHTML = '<th>Talaba</th>' + subjects.map(s => `<th>${s.name}</th>`).join('');
  head.appendChild(header);

  const filteredSubjectId = document.getElementById('filter-subject').value;
  const selectedFilter = document.querySelector('input[name="grade-filter"]:checked')?.value;

  students.forEach(student => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${student.name}</td>`;

    let showRow = true;

    subjects.forEach(subject => {
      const grade = grades.find(g => g.student_id === student.id && g.subject_id === subject.id);
      const score = grade ? grade.score : '';

      const td = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'number';
      input.min = 0;
      input.max = 100;
      input.value = score;
      input.style.backgroundColor = score !== '' ? getColor(score) : '#fff';

      input.addEventListener('change', () => {
        const val = parseInt(input.value);
        if (val >= 0 && val <= 100) {
          updateGrade(student.id, subject.id, val);
        }
      });

      td.appendChild(input);
      row.appendChild(td);

      if (applyFiltering && filteredSubjectId && parseInt(filteredSubjectId) === subject.id) {
        if (score === '') {
          showRow = false;
        } else if (selectedFilter === 'high' && score < 75) {
          showRow = false;
        } else if (selectedFilter === 'medium' && (score < 50 || score >= 75)) {
          showRow = false;
        } else if (selectedFilter === 'low' && score >= 50) {
          showRow = false;
        }
      }
    });

    if (!applyFiltering || showRow) {
      body.appendChild(row);
    }
  });

  const maxRow = document.createElement('tr');
  const avgRow = document.createElement('tr');
  const minRow = document.createElement('tr');

  maxRow.innerHTML = '<td><strong>High</strong></td>';
  avgRow.innerHTML = '<td><strong>Mid</strong></td>';
  minRow.innerHTML = '<td><strong>Low</strong></td>';

  subjects.forEach(subject => {
    const scores = grades.filter(g => g.subject_id === subject.id).map(g => g.score);
    const max = scores.length ? Math.max(...scores) : '';
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : '';
    const min = scores.length ? Math.min(...scores) : '';

    [max, avg, min].forEach((val, idx) => {
      const td = document.createElement('td');
      td.textContent = val;
      td.style.backgroundColor = val !== '' ? getColor(val) : '#fff';
      [maxRow, avgRow, minRow][idx].appendChild(td);
    });
  });

  foot.appendChild(maxRow);
  foot.appendChild(avgRow);
  foot.appendChild(minRow);
}