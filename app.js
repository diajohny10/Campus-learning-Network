/**
 * CampusLink - Live Netlify + Public HTTPS Backend Integration
 * API Base: https://36b650f32864ac.lhr.life/api
 */

class CampusNetApp {
  constructor() {
    this.currentUser = null;
    this.activeTeacherSubject = 'CN';
    this.activeStudentSubject = 'ALL';
    this.activeTeacherTab = 'resources';
    this.activeStudentTab = 'resources';
    
    this.subjects = ['CN', 'DS', 'DMS', 'ECON', 'UHV', 'COA'];
    
    // Live HTTPS API Server URL
    this.apiBase = 'https://36b650f32864ac.lhr.life/api';

    this.initData();
    this.render();
  }

  async initData() {
    const savedStudents = localStorage.getItem('campusnet_students');
    this.students = savedStudents ? JSON.parse(savedStudents) : [
      { id: 'CS2026-001', name: 'Alice Smith', section: 'CS Sec A', password: 'student123' },
      { id: 'CS2026-002', name: 'Bob Martin', section: 'CS Sec A', password: 'student123' },
      { id: 'CS2026-003', name: 'Charlie Davis', section: 'CS Sec B', password: 'student123' },
      { id: 'CS2026-004', name: 'Diana Prince', section: 'CS Sec A', password: 'student123' }
    ];

    const savedResources = localStorage.getItem('campusnet_resources');
    this.resources = savedResources ? JSON.parse(savedResources) : [
      { id: 1, name: 'Module 1 Notes.pdf', subject: 'CN', uploadedBy: 'Teacher CN', date: '2025-05-12', size: '2.4 MB' },
      { id: 2, name: 'Network Topologies.pdf', subject: 'CN', uploadedBy: 'Teacher CN', date: '2025-05-13', size: '1.8 MB' },
      { id: 3, name: 'OSI Model.pdf', subject: 'CN', uploadedBy: 'Teacher CN', date: '2025-05-14', size: '1.3 MB' }
    ];

    const savedTransfers = localStorage.getItem('campusnet_transfers');
    this.transfers = savedTransfers ? JSON.parse(savedTransfers) : [
      { id: 101, from: 'Alice Smith', to: 'Bob Martin', type: 'student_to_student', fileName: 'project_draft.pdf', date: '10:31:12', timestamp: '2026-09-07 10:31:12' }
    ];

    // Live HTTPS API sync
    if (this.apiBase) {
      try {
        const res = await Promise.race([
          fetch(`${this.apiBase}/resources`),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
        ]);
        if (res.ok) {
          const data = await res.json();
          if (data.resources && data.resources.length) this.resources = data.resources;
        }
      } catch (e) {
        // Fallback
      }

      try {
        const resStud = await fetch(`${this.apiBase}/students`);
        if (resStud.ok) {
          const dataStud = await resStud.json();
          if (dataStud.students && dataStud.students.length) this.students = dataStud.students;
        }
      } catch (e) {}

      try {
        const resTrans = await fetch(`${this.apiBase}/transfers`);
        if (resTrans.ok) {
          const dataTrans = await resTrans.json();
          if (dataTrans.transfers && dataTrans.transfers.length) this.transfers = dataTrans.transfers;
        }
      } catch (e) {}
    }

    this.updateStudentDropdowns();
  }

  saveStudents() {
    localStorage.setItem('campusnet_students', JSON.stringify(this.students));
    this.updateStudentDropdowns();
  }

  saveResources() {
    localStorage.setItem('campusnet_resources', JSON.stringify(this.resources));
  }

  saveTransfers() {
    localStorage.setItem('campusnet_transfers', JSON.stringify(this.transfers));
  }

  updateStudentDropdowns() {
    const teacherRecipientEl = document.getElementById('teacher-send-recipient-student');
    const studentRecipientEl = document.getElementById('transfer-recipient-student');

    const optionsHtml = (this.students || []).map(s => `
      <option value="${s.name}">${s.name} (${s.section})</option>
    `).join('');

    if (teacherRecipientEl) teacherRecipientEl.innerHTML = optionsHtml;
    if (studentRecipientEl) studentRecipientEl.innerHTML = optionsHtml;
  }

  showView(viewId) {
    document.querySelectorAll('.page-view').forEach(el => el.classList.remove('active'));
    
    const target = document.getElementById(`view-${viewId}`);
    if (target) {
      target.classList.add('active');
    }

    const navUser = document.getElementById('nav-user-info');
    const navLogout = document.getElementById('nav-logout-btn');

    if (this.currentUser && (viewId === 'teacher-dashboard' || viewId === 'student-dashboard')) {
      navUser.style.display = 'block';
      navLogout.style.display = 'inline-flex';

      if (this.currentUser.role === 'teacher') {
        navUser.innerHTML = `<span class="user-badge"><span class="role-dot teacher"></span> Teacher (${this.currentUser.subjectCode})</span>`;
      } else {
        navUser.innerHTML = `<span class="user-badge"><span class="role-dot student"></span> Student (${this.currentUser.name})</span>`;
      }
    } else {
      navUser.style.display = 'none';
      navLogout.style.display = 'none';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async handleTeacherLogin(e) {
    e.preventDefault();
    const subjectCode = document.getElementById('teacher-subject-code').value;
    const password = document.getElementById('teacher-password').value;

    if (!subjectCode) {
      this.showToast('Please select a Subject Code', 'error');
      return;
    }

    try {
      const response = await fetch(`${this.apiBase}/auth/teacher-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectCode, password })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        this.currentUser = data.user;
        this.activeTeacherSubject = subjectCode;
        this.showToast(`Logged in as Subject Teacher for ${subjectCode}`, 'success');
        this.renderTeacherDashboard();
        this.showView('teacher-dashboard');
        return;
      } else {
        this.showToast(data.message || 'Invalid Password', 'error');
        return;
      }
    } catch (err) {
      if (password === 'teacher123') {
        this.currentUser = { role: 'teacher', name: `Teacher ${subjectCode}`, subjectCode: subjectCode };
        this.activeTeacherSubject = subjectCode;
        this.showToast(`Logged in as Subject Teacher for ${subjectCode}`, 'success');
        this.renderTeacherDashboard();
        this.showView('teacher-dashboard');
      } else {
        this.showToast('Invalid Password. (Use teacher123)', 'error');
      }
    }
  }

  async handleStudentLogin(e) {
    e.preventDefault();
    const nameInput = document.getElementById('student-name').value.trim();
    const passwordInput = document.getElementById('student-password').value;

    if (!nameInput || !passwordInput) {
      this.showToast('Please enter your Name and Password', 'error');
      return;
    }

    try {
      const response = await fetch(`${this.apiBase}/auth/student-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput, password: passwordInput })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        this.currentUser = data.user;
        this.showToast(`Welcome back, ${data.user.name}!`, 'success');
        this.renderStudentDashboard();
        this.showView('student-dashboard');
        return;
      } else {
        this.showToast(data.message || 'Authentication failed', 'error');
        return;
      }
    } catch (err) {
      const student = (this.students || []).find(s => s.name.toLowerCase() === nameInput.toLowerCase());
      if (student && student.password === passwordInput) {
        this.currentUser = { role: 'student', name: student.name, studentId: student.id, section: student.section };
        this.showToast(`Welcome back, ${student.name}!`, 'success');
        this.renderStudentDashboard();
        this.showView('student-dashboard');
      } else if (!student) {
        this.showToast(`Student "${nameInput}" is not registered. Ask your teacher to register you!`, 'error');
      } else {
        this.showToast('Incorrect password for registered student.', 'error');
      }
    }
  }

  logout() {
    this.currentUser = null;
    this.showToast('Logged out successfully', 'info');
    this.showView('landing');
  }

  renderTeacherDashboard() {
    if (!this.currentUser || this.currentUser.role !== 'teacher') return;

    const mySubject = this.currentUser.subjectCode;

    const subjectListEl = document.getElementById('teacher-subject-list');
    subjectListEl.innerHTML = this.subjects.map(code => {
      const count = (this.resources || []).filter(r => r.subject === code).length;
      const isMySubject = code === mySubject;
      const isActive = code === this.activeTeacherSubject;

      return `
        <div class="subject-item ${isActive ? 'active' : ''}" onclick="app.selectTeacherSubject('${code}')">
          <span><i class="fa-solid fa-book-bookmark"></i> ${code}</span>
          <span class="badge" style="${isMySubject ? 'background: var(--accent-indigo); color: #fff;' : ''}">
            ${isMySubject ? 'MY SUBJECT' : `${count}`}
          </span>
        </div>
      `;
    }).join('');

    document.getElementById('teacher-active-subject').innerText = this.activeTeacherSubject;
    
    const uploadBtn = document.getElementById('teacher-upload-btn');
    if (uploadBtn) {
      if (this.activeTeacherSubject === mySubject) {
        uploadBtn.disabled = false;
        uploadBtn.style.opacity = '1';
        uploadBtn.style.cursor = 'pointer';
      } else {
        uploadBtn.disabled = true;
        uploadBtn.style.opacity = '0.5';
        uploadBtn.style.cursor = 'not-allowed';
      }
    }

    this.updateStudentDropdowns();
    this.renderTeacherFilesTable();
    this.renderTeacherInboxTable();
    this.renderRegisteredStudentsRoster();
    this.renderTeacherAuditLogs();
  }

  selectTeacherSubject(code) {
    this.activeTeacherSubject = code;
    this.renderTeacherDashboard();
  }

  showTeacherTab(tabName) {
    this.activeTeacherTab = tabName;
    document.getElementById('teacher-tab-resources').style.display = tabName === 'resources' ? 'block' : 'none';
    document.getElementById('teacher-tab-inbox').style.display = tabName === 'inbox' ? 'block' : 'none';
    document.getElementById('teacher-tab-send-student').style.display = tabName === 'send-student' ? 'block' : 'none';
    document.getElementById('teacher-tab-register-student').style.display = tabName === 'register-student' ? 'block' : 'none';
    document.getElementById('teacher-tab-notifications').style.display = tabName === 'notifications' ? 'block' : 'none';

    const titleMap = {
      resources: `Subject Resources (${this.activeTeacherSubject})`,
      inbox: `Student Submissions (${this.activeTeacherSubject})`,
      'send-student': `Send Direct File to Student`,
      'register-student': `Register New Student`,
      notifications: `Network Transfer Notifications`
    };
    document.getElementById('teacher-view-title').innerText = titleMap[tabName];
  }

  openUploadModal() {
    if (!this.currentUser || this.currentUser.role !== 'teacher') return;
    const mySubject = this.currentUser.subjectCode;

    if (this.activeTeacherSubject !== mySubject) {
      this.showToast(`Permission Denied: You are Teacher ${mySubject}. You can only upload to ${mySubject}!`, 'error');
      return;
    }

    document.getElementById('upload-subject-code').value = mySubject;
    document.getElementById('upload-file-title').value = '';
    document.getElementById('modal-upload').classList.add('active');
  }

  closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
  }

  async handleResourceUpload(e) {
    e.preventDefault();
    if (!this.currentUser || this.currentUser.role !== 'teacher') return;

    const mySubject = this.currentUser.subjectCode;
    const title = document.getElementById('upload-file-title').value.trim();
    const size = document.getElementById('upload-file-size').value.trim() || '2.4 MB';

    if (!title) return;

    try {
      const response = await fetch(`${this.apiBase}/resources/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          subject: mySubject,
          size,
          teacherSubject: mySubject,
          fileContent: `Sample study content for ${title}`
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        this.showToast(`Uploaded "${title}" to ${mySubject}!`, 'success');
      }
    } catch (err) {
      const newResource = { id: Date.now(), name: title, subject: mySubject, uploadedBy: `Teacher ${mySubject}`, date: new Date().toISOString().split('T')[0], size };
      this.resources.unshift(newResource);
      this.saveResources();
      this.showToast(`Uploaded "${title}" to ${mySubject}!`, 'success');
    }

    this.closeModal('modal-upload');
    await this.initData();
    this.renderTeacherDashboard();
  }

  async deleteResource(id) {
    if (!this.currentUser || this.currentUser.role !== 'teacher') return;
    const mySubject = this.currentUser.subjectCode;

    if (!confirm('Are you sure you want to delete this resource?')) return;

    try {
      const response = await fetch(`${this.apiBase}/resources/${id}?teacherSubject=${mySubject}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (response.ok && data.success) {
        this.showToast(`Resource deleted from ${mySubject}`, 'info');
      }
    } catch (err) {
      this.resources = this.resources.filter(r => r.id !== id);
      this.saveResources();
      this.showToast('Resource deleted', 'info');
    }

    await this.initData();
    this.renderTeacherDashboard();
  }

  async handleRegisterStudent(e) {
    e.preventDefault();
    const name = document.getElementById('reg-student-name').value.trim();
    const studentId = document.getElementById('reg-student-id').value.trim();
    const section = document.getElementById('reg-student-section').value;
    const password = document.getElementById('reg-student-password').value.trim() || 'student123';
    const mySubject = this.currentUser ? this.currentUser.subjectCode : 'CN';

    if (!name || !studentId) {
      this.showToast('Please provide student name and ID', 'error');
      return;
    }

    try {
      const response = await fetch(`${this.apiBase}/students/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, studentId, section, password, teacherSubject: mySubject })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        this.showToast(`Successfully registered "${name}" to backend API!`, 'success');
      } else {
        this.showToast(data.message || 'Registration failed', 'error');
      }
    } catch (err) {
      this.students.push({ id: studentId, name, section, password });
      this.saveStudents();
      this.showToast(`Registered "${name}"`, 'success');
    }

    document.getElementById('reg-student-name').value = '';
    document.getElementById('reg-student-id').value = '';

    await this.initData();
    this.renderTeacherDashboard();
  }

  renderRegisteredStudentsRoster() {
    const tbody = document.getElementById('registered-students-tbody');
    if (!tbody) return;

    tbody.innerHTML = (this.students || []).map(s => `
      <tr>
        <td>
          <div class="file-name-cell">
            <span class="user-badge" style="margin-right: 0.5rem;"><span class="role-dot student"></span> ${s.name}</span>
          </div>
        </td>
        <td><code>${s.id}</code></td>
        <td>${s.section}</td>
        <td><code>${s.password}</code></td>
      </tr>
    `).join('');
  }

  async executeTeacherTransferToStudent() {
    const recipient = document.getElementById('teacher-send-recipient-student').value;
    const fileName = document.getElementById('teacher-send-file-name').value.trim();
    const mySubject = this.currentUser ? this.currentUser.subjectCode : 'CN';

    if (!fileName) {
      this.showToast('Please enter a file name to send', 'error');
      return;
    }

    try {
      await fetch(`${this.apiBase}/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `Teacher ${mySubject}`,
          to: recipient,
          type: 'teacher_to_student',
          subject: mySubject,
          fileName
        })
      });
      this.showToast(`Sent "${fileName}" to student ${recipient}!`, 'success');
    } catch (err) {
      this.transfers.unshift({ id: Date.now(), from: `Teacher ${mySubject}`, to: recipient, type: 'teacher_to_student', subject: mySubject, fileName, date: new Date().toLocaleTimeString() });
      this.saveTransfers();
      this.showToast(`Sent "${fileName}" to ${recipient}`, 'success');
    }

    await this.initData();
    this.renderTeacherDashboard();
    this.showTeacherTab('notifications');
  }

  renderTeacherFilesTable() {
    const tbody = document.getElementById('teacher-files-tbody');
    const files = (this.resources || []).filter(r => r.subject === this.activeTeacherSubject);
    const mySubject = this.currentUser ? this.currentUser.subjectCode : '';

    if (files.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5">
            <div class="empty-state">
              <div class="empty-state-icon"><i class="fa-solid fa-folder-open"></i></div>
              <p>No resources uploaded for ${this.activeTeacherSubject} yet.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = files.map(file => {
      const isMySubjectFile = file.subject === mySubject;
      return `
        <tr>
          <td>
            <div class="file-name-cell">
              <span class="file-icon"><i class="fa-solid fa-file-pdf"></i></span>
              ${file.name}
            </div>
          </td>
          <td><span class="user-badge"><span class="role-dot teacher"></span> ${file.uploadedBy}</span></td>
          <td>${file.date}</td>
          <td>${file.size}</td>
          <td>
            ${isMySubjectFile ? `
              <button class="btn btn-danger btn-sm" onclick="app.deleteResource(${file.id})">
                <i class="fa-solid fa-trash-can"></i> Delete
              </button>
            ` : '<span style="color:var(--text-dim); font-size:0.8rem;"><i class="fa-solid fa-lock"></i> View Only</span>'}
          </td>
        </tr>
      `;
    }).join('');
  }

  renderTeacherInboxTable() {
    const tbody = document.getElementById('teacher-inbox-tbody');
    const teacherName = `Teacher ${this.activeTeacherSubject}`;
    
    const submissions = (this.transfers || []).filter(t => t.type === 'student_to_teacher' && (t.to === teacherName || t.subject === this.activeTeacherSubject));

    if (submissions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5">
            <div class="empty-state">
              <div class="empty-state-icon"><i class="fa-solid fa-inbox"></i></div>
              <p>No student submissions received for ${this.activeTeacherSubject}.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = submissions.map(sub => `
      <tr>
        <td><span class="user-badge"><span class="role-dot student"></span> ${sub.from}</span></td>
        <td><strong style="color: var(--primary-blue);">${sub.subject || this.activeTeacherSubject}</strong></td>
        <td>
          <div class="file-name-cell">
            <span class="file-icon" style="background: #e0e7ff; color: #4338ca;">
              <i class="fa-solid fa-file-lines"></i>
            </span>
            ${sub.fileName}
          </div>
        </td>
        <td>${sub.date}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="app.downloadFile('${sub.fileName}')">
            <i class="fa-solid fa-download"></i> Download Submission
          </button>
        </td>
      </tr>
    `).join('');
  }

  renderTeacherAuditLogs() {
    const tbody = document.getElementById('teacher-logs-tbody');
    
    tbody.innerHTML = (this.transfers || []).map(t => {
      let badgeColor = 'var(--primary-blue)';
      let details = '';

      if (t.type === 'student_to_student') {
        badgeColor = 'var(--warning)';
        details = `Student <strong>${t.from}</strong> sent a file to Student <strong>${t.to}</strong> (<code>${t.fileName}</code>)`;
      } else if (t.type === 'student_to_teacher') {
        badgeColor = 'var(--accent-indigo)';
        details = `Student <strong>${t.from}</strong> submitted <code>${t.fileName}</code> to <strong>${t.to}</strong>`;
      } else if (t.type === 'teacher_to_student') {
        badgeColor = 'var(--accent-indigo)';
        details = `You (<strong>${t.from}</strong>) sent direct file <code>${t.fileName}</code> to Student <strong>${t.to}</strong>`;
      } else if (t.type === 'student_registered') {
        badgeColor = 'var(--success)';
        details = `Registered new student <strong>${t.to}</strong> (<code>${t.fileName}</code>)`;
      } else {
        badgeColor = 'var(--success)';
        details = `Uploaded <code>${t.fileName}</code> to <strong>${t.subject || 'Course'}</strong>`;
      }

      return `
        <tr>
          <td style="font-family: monospace; color: var(--text-muted);">${t.date}</td>
          <td>
            <span class="badge" style="background: #f1f5f9; border: 1px solid var(--border-light); color: ${badgeColor}; font-weight:700;">
              ${t.type.replace(/_/g, ' ').toUpperCase()}
            </span>
          </td>
          <td>${details}</td>
        </tr>
      `;
    }).join('');
  }

  // --- STUDENT DASHBOARD RENDER ---
  async renderStudentDashboard() {
    if (!this.currentUser || this.currentUser.role !== 'student') return;

    await this.initData();
    document.getElementById('student-display-name').innerText = this.currentUser.name;

    const subjectListEl = document.getElementById('student-subject-list');
    
    let html = `
      <div class="subject-item ${this.activeStudentSubject === 'ALL' ? 'active' : ''}" onclick="app.selectStudentSubject('ALL')">
        <span><i class="fa-solid fa-layer-group"></i> All Subjects</span>
        <span class="badge">${(this.resources || []).length}</span>
      </div>
    `;

    this.subjects.forEach(code => {
      const count = (this.resources || []).filter(r => r.subject === code).length;
      const isActive = code === this.activeStudentSubject;
      html += `
        <div class="subject-item ${isActive ? 'active' : ''}" onclick="app.selectStudentSubject('${code}')">
          <span><i class="fa-solid fa-book"></i> ${code}</span>
          <span class="badge">${count}</span>
        </div>
      `;
    });

    subjectListEl.innerHTML = html;
    this.renderStudentResourcesTable();
    this.renderStudentInboxTable();
  }

  selectStudentSubject(code) {
    this.activeStudentSubject = code;
    this.renderStudentDashboard();
  }

  showStudentTab(tabName) {
    this.activeStudentTab = tabName;
    document.getElementById('student-tab-resources').style.display = tabName === 'resources' ? 'block' : 'none';
    document.getElementById('student-tab-transfer').style.display = tabName === 'transfer' ? 'block' : 'none';
    document.getElementById('student-tab-inbox').style.display = tabName === 'inbox' ? 'block' : 'none';

    const titleMap = {
      resources: `Subject Resources (${this.activeStudentSubject})`,
      transfer: `Offline Campus File Transfer`,
      inbox: `Private Transfers & File History`
    };
    document.getElementById('student-view-title').innerText = titleMap[tabName];
  }

  renderStudentResourcesTable() {
    const tbody = document.getElementById('student-resources-tbody');
    let files = this.resources || [];
    if (this.activeStudentSubject !== 'ALL') {
      files = files.filter(r => r.subject === this.activeStudentSubject);
    }

    if (files.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5">
            <div class="empty-state">
              <div class="empty-state-icon"><i class="fa-solid fa-folder-open"></i></div>
              <p>No resources found for this subject filter.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = files.map(file => `
      <tr>
        <td>
          <div class="file-name-cell">
            <span class="file-icon"><i class="fa-solid fa-file-pdf"></i></span>
            ${file.name}
          </div>
        </td>
        <td><strong style="color: var(--primary-blue);">${file.subject}</strong></td>
        <td><span class="user-badge"><span class="role-dot teacher"></span> ${file.uploadedBy}</span></td>
        <td>${file.size}</td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="app.downloadFile('${file.filename || file.name}')">
            <i class="fa-solid fa-download"></i> Download
          </button>
        </td>
      </tr>
    `).join('');
  }

  renderStudentInboxTable() {
    const tbody = document.getElementById('student-inbox-tbody');
    const myName = this.currentUser.name;

    const history = (this.transfers || []).filter(t => t.from === myName || t.to === myName);

    if (history.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5">
            <div class="empty-state">
              <div class="empty-state-icon"><i class="fa-solid fa-box-archive"></i></div>
              <p>No transfers or received private files yet.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = history.map(t => {
      const isSender = t.from === myName;
      return `
        <tr>
          <td style="font-family: monospace; color: var(--text-muted);">${t.date}</td>
          <td>
            <span class="badge" style="background: #f1f5f9; color: ${isSender ? 'var(--warning)' : 'var(--success)'}; font-weight:700;">
              ${isSender ? 'SENT' : 'RECEIVED'}
            </span>
          </td>
          <td>${isSender ? `To: <strong>${t.to}</strong>` : `From: <strong>${t.from}</strong>`}</td>
          <td>
            <div class="file-name-cell">
              <span class="file-icon" style="background: #dbeafe;"><i class="fa-solid fa-file-arrow-up"></i></span>
              ${t.fileName}
            </div>
          </td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="app.downloadFile('${t.fileName}')">
              <i class="fa-solid fa-download"></i> Download
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  toggleTransferRecipientOptions() {
    const type = document.getElementById('transfer-target-type').value;
    document.getElementById('recipient-student-group').style.display = type === 'student' ? 'block' : 'none';
    document.getElementById('recipient-teacher-group').style.display = type === 'teacher' ? 'block' : 'none';
  }

  async executeStudentTransfer() {
    const type = document.getElementById('transfer-target-type').value;
    const fileName = document.getElementById('transfer-file-name').value.trim();

    if (!fileName) {
      this.showToast('Please enter a file name to transfer', 'error');
      return;
    }

    let recipient = '';
    let targetSubject = null;

    if (type === 'student') {
      recipient = document.getElementById('transfer-recipient-student').value;
    } else {
      targetSubject = document.getElementById('transfer-recipient-teacher').value;
      recipient = `Teacher ${targetSubject}`;
    }

    try {
      await fetch(`${this.apiBase}/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: this.currentUser.name,
          to: recipient,
          type: type === 'student' ? 'student_to_student' : 'student_to_teacher',
          subject: targetSubject,
          fileName: fileName
        })
      });
      this.showToast(`Transferred "${fileName}" to ${recipient}!`, 'success');
    } catch (err) {
      this.transfers.unshift({ id: Date.now(), from: this.currentUser.name, to: recipient, type: type === 'student' ? 'student_to_student' : 'student_to_teacher', subject: targetSubject, fileName, date: new Date().toLocaleTimeString() });
      this.saveTransfers();
      this.showToast(`Transferred "${fileName}" to ${recipient}`, 'success');
    }

    await this.initData();
    this.renderStudentDashboard();
    this.showStudentTab('inbox');
  }

  downloadFile(fileName) {
    if (this.apiBase) {
      window.open(`${this.apiBase}/../uploads/${fileName}`, '_blank');
    }
    this.showToast(`Download started for "${fileName}"`, 'info');
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
      success: '<i class="fa-solid fa-circle-check" style="color: var(--success);"></i>',
      info: '<i class="fa-solid fa-circle-info" style="color: var(--primary-blue);"></i>',
      error: '<i class="fa-solid fa-circle-exclamation" style="color: var(--danger);"></i>'
    };

    toast.innerHTML = `${icons[type]} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  render() {
    this.showView('landing');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new CampusNetApp();
});
