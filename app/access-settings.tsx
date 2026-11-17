'use client';

import {GraduationCap, Plus, ShieldCheck, X} from 'lucide-react';
import {useEffect, useState, type FormEvent} from 'react';
import {translate, type Locale} from '@/lib/i18n';
import type {Classroom} from '@/lib/classroom-policy';

export default function AccessSettings({classroom, locale, notify, onSaved}: {
  classroom: Classroom;
  locale: Locale;
  notify: (message: string) => void;
  onSaved: (classroom: Classroom) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(classroom.name);
  const [publicAccess, setPublicAccess] = useState(classroom.publicAccess);
  const [emails, setEmails] = useState<string[]>(classroom.allowedEmails);
  const [studentEmail, setStudentEmail] = useState('');
  const [error, setError] = useState('');
  const tr = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) => translate(locale, key, values);

  useEffect(() => {
    setName(classroom.name);
    setPublicAccess(classroom.publicAccess);
    setEmails(classroom.allowedEmails);
    setStudentEmail('');
    setError('');
  }, [classroom]);

  function addStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const email = studentEmail.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(tr('invalidStudentEmail'));
      return;
    }
    if (emails.includes(email)) {
      setError(tr('studentAlreadyAdded'));
      return;
    }
    if (emails.length >= 500) {
      setError(tr('invalidApprovedEmails'));
      return;
    }
    setEmails(current => [...current, email].sort());
    setStudentEmail('');
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/classrooms/${encodeURIComponent(classroom.id)}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name, publicAccess, allowedEmails: emails}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(response.status === 400 ? tr('invalidClassroomSettings') : tr('accessSaveError'));
      onSaved(data as Classroom);
      notify(tr('accessSaved'));
    } catch (saveError) { setError((saveError as Error).message); }
    finally { setSaving(false); }
  }

  return <section className="teacher-panel access-panel" aria-labelledby="access-settings-title">
    <div className="teacher-panel-heading">
      <span className="teacher-panel-icon"><ShieldCheck size={21}/></span>
      <div><span className="eyebrow">{tr('teacherAccess')}</span><h2 id="access-settings-title">{tr('accessSettings')}</h2><p>{tr('accessSettingsIntro', {classroom: classroom.name})}</p></div>
    </div>
    <div className="access-settings-form">
      <label className="classroom-name-field">{tr('classroomName')}<input value={name} onChange={event => setName(event.target.value)} maxLength={80} required/></label>
      <label className="access-policy-toggle"><input type="checkbox" checked={publicAccess} onChange={event => setPublicAccess(event.target.checked)}/><span><strong>{tr('publicAccess')}</strong><small>{publicAccess ? tr('publicAccessHelp') : tr('restrictedAccessHelp')}</small></span></label>
      <section className="classroom-roster" aria-labelledby="classroom-roster-title">
        <div className="classroom-roster-heading"><span><GraduationCap size={19}/></span><div><strong id="classroom-roster-title">{tr('classroomRoster', {classroom: classroom.name})}</strong><small>{tr('approvedStudentsHelp')}</small></div></div>
        <form className="roster-add-form" onSubmit={addStudent}>
          <label htmlFor={`student-roster-email-${classroom.id}`}>{tr('studentEmail')}</label>
          <div><input id={`student-roster-email-${classroom.id}`} type="email" value={studentEmail} onChange={event => setStudentEmail(event.target.value)} placeholder={tr('approvedStudentsPlaceholder')} autoComplete="email" spellCheck={false}/><button type="submit" className="secondary-button"><Plus size={15}/>{tr('addStudent')}</button></div>
        </form>
        <div className="roster-summary"><span>{tr('approvedStudentCount', {count: emails.length})}</span>{publicAccess && <small>{tr('publicRosterNote')}</small>}</div>
        {emails.length ? <ul className="student-roster-list">{emails.map(email => <li key={email}><span>{email}</span><button type="button" className="icon-button roster-remove" onClick={() => setEmails(current => current.filter(item => item !== email))} aria-label={tr('removeStudent', {email})}><X size={15}/></button></li>)}</ul> : <p className="roster-empty">{tr('noApprovedStudents')}</p>}
      </section>
      <p className="teacher-access-note"><ShieldCheck size={16}/>{tr('teacherAlwaysAccess')}</p>
      <p className="access-caveat">{tr('accessChangeCaveat')}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button full" onClick={save} disabled={saving || !name.trim()}>{saving ? tr('savingAccess') : tr('saveAccess')}</button>
    </div>
  </section>;
}
