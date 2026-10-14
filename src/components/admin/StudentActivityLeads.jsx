import { useEffect, useMemo, useState } from 'react';
import sanityClient from '../../sanityClient';

const ACTIVITY_LABELS = {
  daily_login_visit: 'Daily Website Visit',
  view_book_detail: 'Book Detail Modal Open',
  read_sample_pdf: 'Sample PDF / Flipbook Open',
  add_to_cart: 'Add to Cart',
  purchase_complete: 'Purchase Successful'
};

const LEAD_LABELS = {
  HOT: 'Hot Lead',
  WARM: 'Warm Lead',
  CONVERTED: 'Converted',
  COLD: 'Cold'
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export default function StudentActivityLeads() {
  const [activities, setActivities] = useState([]);
  const [activityType, setActivityType] = useState('all');
  const [leadTag, setLeadTag] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    sanityClient.fetch(
      `*[_type == "userActivity"] | order(timestamp desc) {
        _id, studentName, phone, email, bookTitle, action,
        coinsEarned, totalCoins, leadStatus, timestamp
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

  const filteredActivities = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return activities.filter((activity) => {
      if (activityType !== 'all' && activity.action !== activityType) return false;
      if (leadTag !== 'all' && activity.leadStatus !== leadTag) return false;
      if (!normalizedSearch) return true;
      return [activity.studentName, activity.phone]
        .some((value) => String(value || '').toLocaleLowerCase().includes(normalizedSearch));
    });
  }, [activities, activityType, leadTag, search]);

  const downloadCsv = () => {
    const columns = [
      'Student Name',
      'Phone',
      'Email',
      'Interested Book',
      'Activity',
      'Coins Earned',
      'Total Coins',
      'Lead Status',
      'Date & Time'
    ];
    const rows = filteredActivities.map((activity) => [
      activity.studentName,
      activity.phone,
      activity.email,
      activity.bookTitle,
      ACTIVITY_LABELS[activity.action] || activity.action,
      activity.coinsEarned,
      activity.totalCoins,
      LEAD_LABELS[activity.leadStatus] || activity.leadStatus,
      formatDate(activity.timestamp)
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

  return (
    <main style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Student Activity &amp; Leads</h1>
          <p style={{ margin: '6px 0 0', color: '#6b7280' }}>Filter student engagement and export lead records.</p>
        </div>
        <button type="button" onClick={downloadCsv} disabled={loading || filteredActivities.length === 0}>
          Download Leads (CSV)
        </button>
      </header>

      <section aria-label="Activity filters" style={{ display: 'flex', gap: 12, margin: '20px 0', flexWrap: 'wrap' }}>
        <label>
          Activity Type{' '}
          <select value={activityType} onChange={(event) => setActivityType(event.target.value)} style={controlStyle}>
            <option value="all">All</option>
            <option value="add_to_cart">Add to Cart</option>
            <option value="read_sample_pdf">Read Sample</option>
            <option value="daily_login_visit">Daily Visit</option>
          </select>
        </label>
        <label>
          Lead Tag{' '}
          <select value={leadTag} onChange={(event) => setLeadTag(event.target.value)} style={controlStyle}>
            <option value="all">All</option>
            <option value="HOT">Hot Leads</option>
            <option value="WARM">Warm Leads</option>
            <option value="CONVERTED">Converted</option>
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
                {['Student', 'Phone', 'Email', 'Interested Book', 'Activity', 'Coins', 'Total Coins', 'Lead Status', 'Date & Time']
                  .map((heading) => <th key={heading} style={{ padding: 10, borderBottom: '1px solid #d1d5db' }}>{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {filteredActivities.map((activity) => (
                <tr key={activity._id}>
                  <td style={{ padding: 10, borderBottom: '1px solid #e5e7eb' }}>{activity.studentName || 'Student'}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #e5e7eb' }}>{activity.phone || '—'}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #e5e7eb' }}>{activity.email || '—'}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #e5e7eb' }}>{activity.bookTitle || '—'}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #e5e7eb' }}>{ACTIVITY_LABELS[activity.action] || activity.action}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #e5e7eb' }}>{activity.coinsEarned ?? 0}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #e5e7eb' }}>{activity.totalCoins ?? 0}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #e5e7eb' }}>{LEAD_LABELS[activity.leadStatus] || activity.leadStatus || '—'}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid #e5e7eb' }}>{formatDate(activity.timestamp)}</td>
                </tr>
              ))}
              {!filteredActivities.length && (
                <tr><td colSpan={9} style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>No matching activity found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ color: '#6b7280' }}>{filteredActivities.length} activities</p>
    </main>
  );
}
