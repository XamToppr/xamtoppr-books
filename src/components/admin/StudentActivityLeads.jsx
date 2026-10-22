import { Fragment, useEffect, useMemo, useState } from 'react';
import { useClient } from 'sanity';
import sanityClient from '../../sanityClient';

const FOLLOW_UP_STATUSES = ['Pending', 'Contacted', 'Converted', 'Not Interested'];

const ACTIVITY_LABELS = {
  daily_login_visit: 'Daily Website Visit',
  view_book_detail: 'Book Detail Modal Open',
  read_sample_pdf: 'Sample PDF / Flipbook Open',
  add_to_cart: 'Add to Cart',
  purchase_complete: 'Purchase Successful',
  checkout_initiated: 'Checkout Initiated',
  payment_failed: 'Payment Failed',
  payment_abandoned: 'Payment Modal Closed / Abandoned',
  payment_dropped: 'Payment Modal Closed / Abandoned',
  video_watch: 'Video Watched'
};

const LEAD_LABELS = {
  ULTRA_HOT: '🔥 Ultra Hot Lead (Payment Dropped)',
  CONVERTED: 'Customer / Converted',
  HOT: '🔥 Hot Lead',
  WARM: 'Warm Lead',
  COLD: 'Cold'
};

const PAYMENT_DROP_ACTIONS = ['payment_dropped', 'payment_failed', 'payment_abandoned'];

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

const formatWatchDuration = (seconds) => {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return '—';
  const totalSeconds = Math.round(value);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
};

const timestampValue = (value) => {
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getWhatsAppNumber = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
};

const getFirstName = (name) => name.trim().split(/\s+/)[0] || 'there';

const getWhatsAppMessage = (student) => {
  const name = getFirstName(student.name || '');
  if (student.activeDrop) {
    return `Namaste ${name} ji, humne dekha aap ${student.activeDrop.bookTitle || student.latestBook || 'is book'} order karne ki koshish kar rahe the lekin payment complete nahi ho paayi. Kya aapko checkout ya payment me koi samasya aayi? Aapki help ke liye hum yahan hain.`;
  }
  return `Namaste ${name} ji, aapne hamare portal par ${student.latestSampleBook || student.latestBook || 'hamari book'} ka sample dekha tha. Kya aapko book ki preparation ke baare me koi jankari chahiye?`;
};

const getStudentKey = (activity) => {
  const identity = activity.uid
    || activity.student?._ref
    || activity.email?.trim().toLocaleLowerCase()
    || activity.phone?.trim();
  return identity ? String(identity).toLocaleLowerCase() : `activity:${activity._id}`;
};

const getFollowUpId = async (identity) => {
  const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `leadFollowUp-${hash}`;
};

const getLeadStatus = (student) => {
  const latestDrop = [...student.activities].reverse()
    .find(({ action }) => PAYMENT_DROP_ACTIONS.includes(action));
  const latestPurchase = [...student.activities].reverse()
    .find(({ action }) => action === 'purchase_complete');
  if (latestDrop && (!latestPurchase
    || timestampValue(latestDrop.timestamp) > timestampValue(latestPurchase.timestamp))) return 'ULTRA_HOT';
  if (latestPurchase) return 'CONVERTED';
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
      uid: '',
      studentRef: '',
      name: '',
      phone: '',
      email: '',
      totalCoins: 0,
      activities: []
    };

    student.uid ||= activity.uid || '';
    student.studentRef ||= activity.student?._ref || '';
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
    const purchaseActivities = student.activities.filter(({ action }) => action === 'purchase_complete');
    const purchasedBookTitles = new Set(purchaseActivities
      .map(({ bookTitle }) => bookTitle?.trim())
      .filter(Boolean));
    const latestBookActivity = [...student.activities].reverse()
      .find((activity) => activity.bookTitle?.trim());
    const latestSampleActivity = [...student.activities].reverse()
      .find((activity) => activity.action === 'read_sample_pdf' && activity.bookTitle?.trim());
    const activeDrop = latestActivity && PAYMENT_DROP_ACTIONS.includes(latestActivity.action)
      ? latestActivity
      : null;
    const bookCount = purchasedBookTitles.size || purchaseActivities.length;
    return {
      ...student,
      leadStatus: getLeadStatus(student),
      bookCount,
      baseStatus: bookCount
        ? `Customer (${bookCount} ${bookCount === 1 ? 'Book' : 'Books'} Owned)`
        : 'Free Lead',
      activeDrop,
      latestSampleBook: latestSampleActivity?.bookTitle || '',
      latestBook: latestBookActivity?.bookTitle || '',
      lastActiveAt: latestActivity?.timestamp || ''
    };
  }).sort((a, b) => (
    Number(b.leadStatus === 'ULTRA_HOT') - Number(a.leadStatus === 'ULTRA_HOT')
      || timestampValue(b.lastActiveAt) - timestampValue(a.lastActiveAt)
  ));
};

const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export default function StudentActivityLeads() {
  const studioClient = useClient({ apiVersion: '2024-01-01' });
  const [activities, setActivities] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [activityType, setActivityType] = useState('all');
  const [leadTag, setLeadTag] = useState('all');
  const [quickFilter, setQuickFilter] = useState('all');
  const [followUpFilter, setFollowUpFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [activeLead, setActiveLead] = useState(null);
  const [remark, setRemark] = useState('');
  const [followUpStatus, setFollowUpStatus] = useState('Pending');
  const [savingRemark, setSavingRemark] = useState(false);
  const [followUpError, setFollowUpError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(null);

  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    const initialUpdate = window.setTimeout(updateNow, 0);
    const interval = window.setInterval(updateNow, 60_000);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;
    studioClient.fetch(
      '*[_type == "leadFollowUp"]{_id, identity, uid, student, studentName, status, latestRemark, updatedAt, history}'
    ).then((rows) => {
      if (active) setFollowUps(rows);
    }).catch((fetchError) => {
      console.error('Failed to load lead follow-ups:', fetchError);
      if (active) setFollowUpError('Unable to load lead follow-ups. Please try again.');
    });

    return () => {
      active = false;
    };
  }, [studioClient]);

  useEffect(() => {
    let active = true;
    sanityClient.withConfig({ useCdn: false }).fetch(
      `*[_type == "userActivity"] | order(timestamp desc) {
        _id, uid, student, studentName, phone, email, bookTitle, action,
        coinsEarned, totalCoins, amount, context, reason, leadStatus, timestamp,
        courseId, courseTitle, videoId, videoTitle, watchDurationSeconds,
        videoDurationSeconds, videoProgressPercent
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

  const followUpsByIdentity = useMemo(
    () => new Map(followUps.map((followUp) => [followUp.identity, followUp])),
    [followUps]
  );

  const students = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return groupActivitiesByStudent(activities).filter((student) => {
      student.followUp = followUpsByIdentity.get(student.key) || null;
      const status = student.followUp?.status || 'Pending';
      if (leadTag !== 'all' && student.leadStatus !== leadTag) return false;
      if (activityType !== 'all' && !student.activities.some(({ action }) => action === activityType)) return false;
      if (quickFilter === 'dropped' && !student.activeDrop) return false;
      if (quickFilter === 'customers' && !student.bookCount) return false;
      if (quickFilter === 'warm' && !student.activities.some(({ action }) => action === 'read_sample_pdf')) return false;
      if (followUpFilter !== 'all' && status !== followUpFilter) return false;
      return !normalizedSearch
        || [student.name, student.phone]
          .some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
    });
  }, [activities, activityType, followUpFilter, followUpsByIdentity, leadTag, quickFilter, search]);

  const openRemarkModal = (student) => {
    setActiveLead(student);
    setRemark('');
    setFollowUpStatus(student.followUp?.status || 'Pending');
    setFollowUpError('');
  };

  const saveFollowUp = async (event) => {
    event.preventDefault();
    const note = remark.trim();
    if (!activeLead || !note || savingRemark) return;

    setSavingRemark(true);
    setFollowUpError('');
    try {
      const id = await getFollowUpId(activeLead.key);
      await studioClient.createIfNotExists({
        _id: id,
        _type: 'leadFollowUp',
        identity: activeLead.key,
        uid: activeLead.uid || undefined,
        student: activeLead.studentRef ? { _type: 'reference', _ref: activeLead.studentRef } : undefined,
        studentName: activeLead.name || 'Student',
        status: followUpStatus
      });
      const createdAt = new Date().toISOString();
      const entry = {
        _key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        remark: note,
        status: followUpStatus,
        createdAt
      };
      const savedFollowUp = await studioClient.patch(id)
        .set({ status: followUpStatus, latestRemark: note, updatedAt: createdAt })
        .setIfMissing({ history: [] })
        .append('history', [entry])
        .commit();

      setFollowUps((current) => [
        ...current.filter((followUp) => followUp._id !== id),
        savedFollowUp
      ]);
      setActiveLead(null);
    } catch (saveError) {
      console.error('Failed to save lead follow-up:', saveError);
      setFollowUpError('Unable to save this follow-up. Check your Sanity permissions and try again.');
    } finally {
      setSavingRemark(false);
    }
  };

  const downloadCsv = () => {
    const columns = [
      'Name',
      'Phone',
      'Email',
      'Customer Status',
      'Active Alert',
      'Lead Score',
      'Total Coins',
      'Total Actions',
      'Latest Interested Book',
      'Last Active Time',
      'Follow-up Status',
      'Latest Follow-up Remark'
    ];
    const rows = students.map((student) => [
      student.name,
      student.phone,
      student.email,
      student.baseStatus,
      student.activeDrop ? `Drop on ${student.activeDrop.bookTitle || student.latestBook || 'book'}` : '',
      LEAD_LABELS[student.leadStatus],
      student.totalCoins,
      student.activities.length,
      student.latestBook,
      formatDate(student.lastActiveAt),
      student.followUp?.status || 'Pending',
      student.followUp?.latestRemark || ''
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
  const cellStyle = { padding: '12px 14px', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top' };

  return (
    <main style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <style>{`
        @keyframes lead-alert-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.12); }
          50% { box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.22); }
        }
        .lead-hot-row > td {
          border-top: 2px solid #fb923c !important;
          border-bottom: 2px solid #fb923c !important;
        }
        .student-history-table tbody tr:nth-child(even) { background: #f8fafc; }
      `}</style>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Student Activity &amp; Leads</h1>
          <p style={{ margin: '6px 0 0', color: '#6b7280' }}>One row per student, with a chronological activity history.</p>
        </div>
        <button type="button" onClick={downloadCsv} disabled={loading || students.length === 0}>
          Download Leads (CSV)
        </button>
      </header>

      <nav aria-label="Quick lead filters" style={{ display: 'flex', gap: 8, margin: '20px 0 12px', flexWrap: 'wrap' }}>
        {[
          ['all', 'All Leads'],
          ['dropped', '🚨 Dropped Checkouts (Urgent)'],
          ['customers', 'Existing Customers'],
          ['warm', 'Warm Readers']
        ].map(([filter, label]) => (
          <button
            key={filter}
            type="button"
            aria-pressed={quickFilter === filter}
            onClick={() => setQuickFilter(filter)}
            style={{
              ...controlStyle,
              cursor: 'pointer',
              fontWeight: 700,
              color: quickFilter === filter ? '#fff' : '#374151',
              background: quickFilter === filter ? '#1d4ed8' : '#fff',
              borderColor: quickFilter === filter ? '#1d4ed8' : '#d1d5db'
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      <nav aria-label="Follow-up status filters" style={{ display: 'flex', gap: 8, margin: '12px 0 20px', flexWrap: 'wrap' }}>
        {[
          ['all', 'All Follow-ups'],
          ['Pending', 'Pending Follow-ups'],
          ['Contacted', 'Contacted'],
          ['Converted', 'Converted'],
          ['Not Interested', 'Not Interested']
        ].map(([status, label]) => (
          <button
            key={status}
            type="button"
            aria-pressed={followUpFilter === status}
            onClick={() => setFollowUpFilter(status)}
            style={{
              ...controlStyle,
              cursor: 'pointer',
              fontWeight: 700,
              color: followUpFilter === status ? '#fff' : '#374151',
              background: followUpFilter === status ? '#0f766e' : '#fff',
              borderColor: followUpFilter === status ? '#0f766e' : '#d1d5db'
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      <section aria-label="Student filters" style={{ display: 'flex', gap: 12, margin: '20px 0', flexWrap: 'wrap' }}>
        <label>
          Activity Type{' '}
          <select value={activityType} onChange={(event) => setActivityType(event.target.value)} style={controlStyle}>
            <option value="all">All</option>
            <option value="add_to_cart">Add to Cart</option>
            <option value="read_sample_pdf">Read Sample</option>
            <option value="view_book_detail">Book Detail Modal Open</option>
            <option value="daily_login_visit">Daily Visit</option>
            <option value="payment_failed">Payment Failed</option>
            <option value="payment_abandoned">Payment Modal Closed / Abandoned</option>
            <option value="checkout_initiated">Checkout Initiated</option>
            <option value="payment_dropped">Payment Attempt Failed / Modal Closed</option>
            <option value="video_watch">Video Watched</option>
          </select>
        </label>
        <label>
          Lead Tag{' '}
          <select value={leadTag} onChange={(event) => setLeadTag(event.target.value)} style={controlStyle}>
            <option value="all">All</option>
            <option value="ULTRA_HOT">Ultra Hot Lead (Payment Dropped)</option>
            <option value="CONVERTED">Customer / Converted</option>
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
      {followUpError && !activeLead && <p role="alert" style={{ color: '#b91c1c' }}>{followUpError}</p>}
      {loading ? <p>Loading student activity…</p> : (
        <div style={{ overflowX: 'auto', border: '1px solid #dbe2ea', borderRadius: 12, background: '#fff', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)' }}>
          <table style={{ width: '100%', minWidth: 1260, borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                {['Student Name', 'Phone Number', 'Email', 'Customer Status & Active Alert', 'Follow-up', 'Total Coins', 'Total Activities', 'Latest Interested Book', 'Last Active', 'History']
                  .map((heading) => <th key={heading} style={{ padding: '13px 14px', borderBottom: '1px solid #cbd5e1', background: '#f1f5f9', color: '#334155', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {students.map((student, studentIndex) => {
                const isExpanded = expandedStudent === student.key;
                const elapsed = now !== null && timestampValue(student.lastActiveAt)
                  ? Math.max(0, now - timestampValue(student.lastActiveAt))
                  : null;
                const isHot = elapsed !== null && elapsed <= 60 * 60 * 1000;
                const isToday = elapsed !== null && elapsed <= 24 * 60 * 60 * 1000;
                const recoveryMessage = encodeURIComponent(getWhatsAppMessage(student));
                return (
                  <Fragment key={student.key}>
                    <tr className={isHot ? 'lead-hot-row' : undefined} style={{ background: isHot ? '#fff7ed' : studentIndex % 2 ? '#f8fafc' : '#fff' }}>
                      <td style={cellStyle}>
                        {student.name || 'Student'}
                        {isHot && <div style={{ marginTop: 5, color: '#c2410c', fontSize: 12, fontWeight: 700 }}>⚡ Hot (Just Now)</div>}
                      </td>
                      <td style={cellStyle}>
                        {student.phone ? (
                          <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <a href={`tel:${student.phone}`}>{student.phone}</a>
                            <a href={`https://wa.me/${getWhatsAppNumber(student.phone)}?text=${recoveryMessage}`} target="_blank" rel="noopener noreferrer">
                              WhatsApp Recovery
                            </a>
                          </span>
                        ) : '—'}
                      </td>
                      <td style={cellStyle}>{student.email || '—'}</td>
                      <td style={cellStyle}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          borderRadius: 999,
                          padding: '4px 9px',
                          fontSize: 12,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          color: student.bookCount ? '#166534' : '#374151',
                          background: student.bookCount ? '#dcfce7' : '#f3f4f6',
                          border: student.bookCount ? '1px solid #86efac' : '1px solid #d1d5db'
                        }}>
                          {student.baseStatus}
                        </span>
                        {student.activeDrop && (
                          <div style={{
                            display: 'table',
                            marginTop: 6,
                            borderRadius: 999,
                            padding: '4px 9px',
                            color: '#9a3412',
                            background: '#ffedd5',
                            border: '1px solid #fb923c',
                            fontSize: 12,
                            fontWeight: 700,
                            animation: 'lead-alert-pulse 1.8s ease-in-out infinite'
                          }}>
                            🔥 Drop on {student.activeDrop.bookTitle || student.latestBook || 'Book'}
                          </div>
                        )}
                        <div style={{ marginTop: 6, color: '#6b7280', fontSize: 12 }}>
                          {LEAD_LABELS[student.leadStatus]}
                        </div>
                      </td>
                      <td style={cellStyle}>
                        <span style={{
                          display: 'inline-flex',
                          borderRadius: 999,
                          padding: '4px 9px',
                          fontSize: 12,
                          fontWeight: 700,
                          color: student.followUp?.status === 'Converted' ? '#166534' : '#0f172a',
                          background: student.followUp?.status === 'Converted' ? '#dcfce7' : '#e0f2fe',
                          border: '1px solid #bae6fd'
                        }}>
                          {student.followUp?.status || 'Pending'}
                        </span>
                        <div style={{ maxWidth: 240, marginTop: 6, color: '#475569', fontSize: 12, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                          {student.followUp?.latestRemark || 'No remarks yet'}
                        </div>
                        {student.followUp?.updatedAt && (
                          <div style={{ marginTop: 4, color: '#64748b', fontSize: 11 }}>
                            {formatDate(student.followUp.updatedAt)}
                          </div>
                        )}
                        <button type="button" onClick={() => openRemarkModal(student)} style={{ marginTop: 7 }}>
                          + Add Remark
                        </button>
                      </td>
                      <td style={cellStyle}>{student.totalCoins}</td>
                      <td style={cellStyle}>{student.activities.length} activities</td>
                      <td style={{
                        ...cellStyle,
                        fontWeight: student.leadStatus === 'ULTRA_HOT' ? 700 : 400,
                        color: student.leadStatus === 'ULTRA_HOT' ? '#9a3412' : 'inherit'
                      }}>
                        {student.latestBook || '—'}
                      </td>
                      <td style={cellStyle}>
                        {formatDate(student.lastActiveAt)}
                        {isToday && (
                          <div style={{
                            display: 'table',
                            marginTop: 5,
                            borderRadius: 999,
                            padding: '3px 8px',
                            color: isHot ? '#9a3412' : '#1d4ed8',
                            background: isHot ? '#ffedd5' : '#dbeafe',
                            fontSize: 11,
                            fontWeight: 700
                          }}>
                            Today
                          </div>
                        )}
                      </td>
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
                        <td colSpan={10} style={{ padding: 0, background: '#eef2f7', borderBottom: '2px solid #cbd5e1' }}>
                          <section aria-label={`${student.name || 'Student'} activity history`} style={{ margin: 14, overflow: 'hidden', border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', boxShadow: 'inset 0 1px 2px rgba(15, 23, 42, 0.04)' }}>
                            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: '1px solid #dbe2ea', background: '#f8fafc' }}>
                              <strong style={{ color: '#1e293b', fontSize: 13 }}>Activity history</strong>
                              <span style={{ color: '#64748b', fontSize: 12 }}>{student.activities.length} recorded events · chronological</span>
                            </header>
                          <table className="student-history-table" style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                              <tr>
                                {['Activity Type', 'Book / Course / Class', 'Watch Time', 'Progress', 'Amount', 'Coins Earned', 'Context / Reason', 'Timestamp']
                                  .map((heading) => <th key={heading} style={{ padding: '10px 12px', borderBottom: '1px solid #d1d5db', background: '#f8fafc', color: '#475569', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>{heading}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {Array.isArray(student.activities) && student.activities.length > 0
                                ? student.activities.map((activity, index) => {
                                  const item = activity || {};
                                  return (
                                    <tr key={item._id || `${student.key}-activity-${index}`}>
                                      <td style={cellStyle}>
                                        {ACTIVITY_LABELS[item.action] || item.action || 'User Activity'}
                                      </td>
                                      <td style={cellStyle}>
                                        <strong>{item.videoTitle || item.courseTitle || item.bookTitle || '—'}</strong>
                                        {item.courseTitle && item.videoTitle && (
                                          <div style={{ marginTop: 3, color: '#64748b', fontSize: 12 }}>{item.courseTitle}</div>
                                        )}
                                      </td>
                                      <td style={cellStyle}>{item.action === 'video_watch' ? formatWatchDuration(item.watchDurationSeconds) : '—'}</td>
                                      <td style={cellStyle}>
                                        {item.action === 'video_watch' && Number.isFinite(Number(item.videoProgressPercent))
                                          ? `${Math.round(Number(item.videoProgressPercent))}%`
                                          : '—'}
                                      </td>
                                      <td style={cellStyle}>{item.amount ? `₹${item.amount}` : '—'}</td>
                                      <td style={cellStyle}>{item.coinsEarned ? `+${item.coinsEarned}` : '—'}</td>
                                      <td style={cellStyle}>{item.context || item.reason || '—'}</td>
                                      <td style={cellStyle}>{formatDate(item.timestamp)}</td>
                                    </tr>
                                  );
                                })
                                : (
                                  <tr>
                                    <td colSpan={8} style={{ ...cellStyle, textAlign: 'center', color: '#64748b' }}>
                                      No activity history available.
                                    </td>
                                  </tr>
                                )}
                            </tbody>
                          </table>
                          </section>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!students.length && (
                <tr><td colSpan={10} style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>No matching students found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ color: '#6b7280' }}>{students.length} students</p>
      {activeLead && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingRemark) setActiveLead(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'grid',
            placeItems: 'center',
            padding: 16,
            background: 'rgba(15, 23, 42, 0.55)'
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="lead-follow-up-title"
            style={{ width: 'min(100%, 480px)', padding: 24, borderRadius: 14, background: '#fff', boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25)' }}
          >
            <h2 id="lead-follow-up-title" style={{ margin: '0 0 6px', fontSize: 20 }}>
              Add lead follow-up
            </h2>
            <p style={{ margin: '0 0 18px', color: '#64748b' }}>
              {activeLead.name || 'Student'}{activeLead.phone ? ` · ${activeLead.phone}` : ''}
            </p>
            <form onSubmit={saveFollowUp}>
              <label style={{ display: 'block', marginBottom: 14, fontWeight: 700 }}>
                Follow-up status
                <select
                  value={followUpStatus}
                  onChange={(event) => setFollowUpStatus(event.target.value)}
                  style={{ ...controlStyle, display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 6 }}
                >
                  {FOLLOW_UP_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label style={{ display: 'block', fontWeight: 700 }}>
                Remark
                <textarea
                  autoFocus
                  required
                  maxLength={2000}
                  rows={5}
                  value={remark}
                  onChange={(event) => setRemark(event.target.value)}
                  placeholder="Add a note about this follow-up..."
                  style={{ ...controlStyle, display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 6, resize: 'vertical' }}
                />
              </label>
              {followUpError && <p role="alert" style={{ color: '#b91c1c' }}>{followUpError}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                <button type="button" disabled={savingRemark} onClick={() => setActiveLead(null)}>
                  Cancel
                </button>
                <button type="submit" disabled={savingRemark || !remark.trim()}>
                  {savingRemark ? 'Saving…' : 'Save follow-up'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
