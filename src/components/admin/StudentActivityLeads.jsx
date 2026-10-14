import { Fragment, useEffect, useMemo, useState } from 'react';
import sanityClient from '../../sanityClient';

const ACTIVITY_LABELS = {
  daily_login_visit: 'Daily Website Visit',
  view_book_detail: 'Book Detail Modal Open',
  read_sample_pdf: 'Sample PDF / Flipbook Open',
  add_to_cart: 'Add to Cart',
  purchase_complete: 'Purchase Successful'
};

const LEAD_LABELS = {
  HOT: '🔥 Hot Lead',
  WARM: 'Warm Lead',
  COLD: 'Cold'
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

const timestampValue = (value) => {
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getStudentKey = (activity) => {
  const identity = activity.uid
    || activity.student?._ref
    || activity.email?.trim().toLocaleLowerCase()
    || activity.phone?.trim();
  return identity ? String(identity).toLocaleLowerCase() : `activity:${activity._id}`;
};

const getLeadStatus = (student) => {
  if (student.totalCoins >= 100 || student.activities.some(({ action }) => action === 'add_to_cart')) {
    return 'HOT';
  }
  if (student.activities.some(({ action }) => action === 'read_sample_pdf')) return 'WARM';
  return 'COLD';
};

const groupActivitiesByStudent = (activities) => {
  const grouped = new Map();

  activities.forEach((activity) => {
    const key = getStudentKey(activity);
    const student = grouped.get(key) || {
      key,
      name: '',
      phone: '',
      email: '',
      totalCoins: 0,
      activities: []
    };

    student.name ||= activity.studentName || '';
    student.phone ||= activity.phone || '';
    student.email ||= activity.email || '';
    student.totalCoins = Math.max(student.totalCoins, Number(activity.totalCoins) || 0);
    student.activities.push(activity);
    grouped.set(key, student);
  });

  return [...grouped.values()].map((student) => {
    student.activities.sort((a, b) => timestampValue(a.timestamp) - timestampValue(b.timestamp));
    const latestActivity = student.activities[student.activities.length - 1];
    const latestBookActivity = [...student.activities].reverse()
      .find((activity) => activity.bookTitle?.trim());
    return {
      ...student,
      leadStatus: getLeadStatus(student),
      latestBook: latestBookActivity?.bookTitle || '',
      lastActiveAt: latestActivity?.timestamp || ''
    };
  }).sort((a, b) => timestampValue(b.lastActiveAt) - timestampValue(a.lastActiveAt));
};

const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export default function StudentActivityLeads() {
  const [activities, setActivities] = useState([]);
  const [activityType, setActivityType] = useState('all');
  const [leadTag, setLeadTag] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    sanityClient.fetch(
      `*[_type == "userActivity"] | order(timestamp desc) {
        _id, uid, student, studentName, phone, email, bookTitle, action,
        coinsEarned, totalCoins, timestamp
      }`
    ).then((rows) => {
      if (active) setActivities(rows);
    }).catch((fetchError) => {
      console.error('Failed to load Student Activity & Leads:', fetchError);
      if (active) setError('Unable to load student activity. Please try again.');
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const students = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return groupActivitiesByStudent(activities).filter((student) => {
      if (leadTag !== 'all' && student.leadStatus !== leadTag) return false;
      if (activityType !== 'all' && !student.activities.some(({ action }) => action === activityType)) return false;
      return !normalizedSearch
        || [student.name, student.phone]
          .some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
    });
  }, [activities, activityType, leadTag, search]);

  const downloadCsv = () => {
    const columns = [
      'Name',
      'Phone',
      'Email',
      'Lead Status',
      'Total Coins',
      'Total Actions',
      'Latest Interested Book',
      'Last Active Time'
    ];
    const rows = students.map((student) => [
      student.name,
      student.phone,
      student.email,
      LEAD_LABELS[student.leadStatus],
      student.totalCoins,
      student.activities.length,
      student.latestBook,
      formatDate(student.lastActiveAt)
    ]);
    const csv = [columns, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    const file = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `xamtoppr-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const controlStyle = {
    border: '1px solid #d1d5db',
    borderRadius: 6,
    padding: '8px 10px',
    minHeight: 38
  };
  const cellStyle = { padding: 10, borderBottom: '1px solid #e5e7eb', verticalAlign: 'top' };

  return (
    <main style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Student Activity &amp; Leads</h1>
          <p style={{ margin: '6px 0 0', color: '#6b7280' }}>One row per student, with a chronological activity history.</p>
        </div>
        <button type="button" onClick={downloadCsv} disabled={loading || students.length === 0}>
          Download Leads (CSV)
        </button>
      </header>

      <section aria-label="Student filters" style={{ display: 'flex', gap: 12, margin: '20px 0', flexWrap: 'wrap' }}>
        <label>
          Activity Type{' '}
          <select value={activityType} onChange={(event) => setActivityType(event.target.value)} style={controlStyle}>
            <option value="all">All</option>
            <option value="add_to_cart">Add to Cart</option>
            <option value="read_sample_pdf">Read Sample</option>
            <option value="view_book_detail">Book Detail Modal Open</option>
            <option value="daily_login_visit">Daily Visit</option>
          </select>
        </label>
        <label>
          Lead Tag{' '}
          <select value={leadTag} onChange={(event) => setLeadTag(event.target.value)} style={controlStyle}>
            <option value="all">All</option>
            <option value="HOT">Hot Lead</option>
            <option value="WARM">Warm Lead</option>
            <option value="COLD">Cold</option>
          </select>
        </label>
        <label style={{ flex: '1 1 240px' }}>
          Search student name or phone{' '}
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or phone number"
            style={{ ...controlStyle, width: '100%', boxSizing: 'border-box' }}
          />
        </label>
      </section>

      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
      {loading ? <p>Loading student activity…</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                {['Student Name', 'Phone Number', 'Email', 'Highest Lead Status', 'Total Coins', 'Total Activities', 'Latest Interested Book', 'Last Active', 'History']
                  .map((heading) => <th key={heading} style={{ padding: 10, borderBottom: '1px solid #d1d5db' }}>{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const isExpanded = expandedStudent === student.key;
                return (
                  <Fragment key={student.key}>
                    <tr>
                      <td style={cellStyle}>{student.name || 'Student'}</td>
                      <td style={cellStyle}>{student.phone || '—'}</td>
                      <td style={cellStyle}>{student.email || '—'}</td>
                      <td style={cellStyle}>{LEAD_LABELS[student.leadStatus]}</td>
                      <td style={cellStyle}>{student.totalCoins}</td>
                      <td style={cellStyle}>{student.activities.length} activities</td>
                      <td style={cellStyle}>{student.latestBook || '—'}</td>
                      <td style={cellStyle}>{formatDate(student.lastActiveAt)}</td>
                      <td style={cellStyle}>
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={() => setExpandedStudent(isExpanded ? null : student.key)}
                        >
                          {isExpanded ? '− Hide History' : '+ View History'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} style={{ padding: 12, background: '#f9fafb' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                              <tr>
                                {['Activity Type', 'Book Title', 'Coins Earned', 'Timestamp']
                                  .map((heading) => <th key={heading} style={{ padding: 8, borderBottom: '1px solid #d1d5db' }}>{heading}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {student.activities.map((activity) => (
                                <tr key={activity._id}>
                                  <td style={cellStyle}>{ACTIVITY_LABELS[activity.action] || activity.action}</td>
                                  <td style={cellStyle}>{activity.bookTitle || '—'}</td>
                                  <td style={cellStyle}>+{Number(activity.coinsEarned) || 0}</td>
                                  <td style={cellStyle}>{formatDate(activity.timestamp)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!students.length && (
                <tr><td colSpan={9} style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>No matching students found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ color: '#6b7280' }}>{students.length} students</p>
    </main>
  );
}
