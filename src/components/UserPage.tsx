import { useState } from 'react';
import { useStore } from '../store';
import type { LoanType } from '../types';

type UserTab = 'borrow' | 'mine';

export default function UserPage() {
  const { users, currentUser, setCurrentUser } = useStore();

  if (!currentUser) {
    return (
      <div className="page">
        <h1 className="page-title">פורטל חייל</h1>
        <div className="card user-select-card">
          <h3>בחר את שמך להמשך</h3>
          <div className="user-grid">
            {users.map((u) => (
              <button
                key={u.id}
                className="user-card-btn"
                onClick={() => setCurrentUser(u)}
              >
                <div className="user-avatar">{u.name.charAt(0)}</div>
                <div>
                  <div className="user-name">{u.name}</div>
                  <div className="user-stat">
                    {u.acquisitions.length} פריטים ברשותי
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <UserDashboard />;
}

function UserDashboard() {
  const [tab, setTab] = useState<UserTab>('borrow');
  const { currentUser, setCurrentUser } = useStore();

  const activeCount = currentUser!.acquisitions.length;

  return (
    <div className="page">
      <div className="user-topbar">
        <div className="user-info-pill">
          <div className="user-avatar sm">{currentUser!.name.charAt(0)}</div>
          <div>
            <strong>{currentUser!.name}</strong>
            <span>{activeCount} פריטים ברשותך</span>
          </div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => setCurrentUser(null)}>
          החלף חייל
        </button>
      </div>

      <div className="inner-tabs">
        <button
          className={`inner-tab ${tab === 'borrow' ? 'active' : ''}`}
          onClick={() => setTab('borrow')}
        >
          השאלת ציוד
        </button>
        <button
          className={`inner-tab ${tab === 'mine' ? 'active' : ''}`}
          onClick={() => setTab('mine')}
        >
          הציוד שברשותי
          {activeCount > 0 && <span className="tab-badge">{activeCount}</span>}
        </button>
      </div>

      {tab === 'borrow' ? <BorrowTab /> : <MyEquipmentTab />}
    </div>
  );
}

/* ── השאלת ציוד ── */
function BorrowTab() {
  const { items, currentUser, requestAcquireItem } = useStore();
  const [itemId, setItemId] = useState('');
  const [amount, setAmount] = useState(1);
  const [loanType, setLoanType] = useState<LoanType>('permanent');
  const [missionName, setMissionName] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedItem = items.find((i) => i.id === itemId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!itemId) { setMsg({ type: 'error', text: 'יש לבחור מוצר' }); return; }
    if (amount < 1) { setMsg({ type: 'error', text: 'כמות חייבת להיות לפחות 1' }); return; }
    if (loanType === 'temporary' && !missionName.trim()) {
      setMsg({ type: 'error', text: 'יש להזין שם משימה' }); return;
    }
    if (loanType === 'temporary' && !returnDate) {
      setMsg({ type: 'error', text: 'יש להזין תאריך החזרה' }); return;
    }

    const ok = requestAcquireItem(
      currentUser!.id,
      itemId,
      amount,
      loanType,
      loanType === 'temporary' ? missionName.trim() : undefined,
      loanType === 'temporary' ? returnDate : undefined
    );

    if (ok) {
      setMsg({ type: 'success', text: 'הבקשה נשלחה ✓ ממתין לאישור מנהל' });
      setItemId(''); setAmount(1); setLoanType('permanent');
      setMissionName(''); setReturnDate('');
      setTimeout(() => setMsg(null), 4000);
    } else {
      setMsg({ type: 'error', text: 'אין מספיק מלאי זמין' });
    }
  }

  return (
    <div className="card">
      <h3>בקשת ציוד</h3>
      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>קטגוריה / מוצר</label>
            <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">— בחר מוצר —</option>
              {items.map((i) => (
                <option key={i.id} value={i.id} disabled={i.available === 0}>
                  {i.category} / {i.name} ({i.available} זמינים)
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ maxWidth: 110 }}>
            <label>כמות</label>
            <input
              type="number"
              min={1}
              max={selectedItem?.available ?? 99}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="form-row" style={{ marginTop: '.85rem' }}>
          <div className="form-group">
            <label>סוג השאלה</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  value="permanent"
                  checked={loanType === 'permanent'}
                  onChange={() => setLoanType('permanent')}
                />
                השאלה קבועה
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  value="temporary"
                  checked={loanType === 'temporary'}
                  onChange={() => setLoanType('temporary')}
                />
                השאלה זמנית
              </label>
            </div>
          </div>
        </div>

        {loanType === 'temporary' && (
          <div className="form-row" style={{ marginTop: '.85rem' }}>
            <div className="form-group">
              <label>שם המשימה</label>
              <input
                value={missionName}
                onChange={(e) => setMissionName(e.target.value)}
                placeholder="שם המשימה"
              />
            </div>
            <div className="form-group">
              <label>תאריך החזרה</label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
              />
            </div>
          </div>
        )}

        <button type="submit" className="btn btn-primary" style={{ marginTop: '1.25rem' }}>
          שלח בקשה
        </button>
      </form>
    </div>
  );
}

/* ── הציוד שברשותי ── */
function MyEquipmentTab() {
  const { currentUser, requestReturn } = useStore();
  const acqs = currentUser!.acquisitions;

  return (
    <div className="card">
      <h3>הציוד שברשותי ({acqs.length} פריטים)</h3>
      {acqs.length === 0 ? (
        <p className="empty-note">אין ציוד ברשותך כרגע</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>מוצר</th>
              <th>כמות</th>
              <th>תאריך חתימה</th>
              <th>סוג השאלה</th>
              <th>פרטי משימה</th>
              <th>סטטוס</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {acqs.map((a) => (
              <tr key={a.id}>
                <td><strong>{a.itemName}</strong></td>
                <td>{a.amount}</td>
                <td>{a.acquiredAt}</td>
                <td>
                  <span className={`status-badge ${a.loanType === 'permanent' ? 'loan-permanent' : 'loan-temporary'}`}>
                    {a.loanType === 'permanent' ? 'קבועה' : 'זמנית'}
                  </span>
                </td>
                <td style={{ fontSize: '.85rem', color: '#555' }}>
                  {a.loanType === 'temporary'
                    ? `${a.missionName ?? ''}${a.returnDate ? ` | עד ${a.returnDate}` : ''}`
                    : '—'}
                </td>
                <td>
                  <span className={`status-badge ${statusClass(a.status)}`}>
                    {statusLabel(a.status)}
                  </span>
                </td>
                <td>
                  {a.status === 'approved' && (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => requestReturn(currentUser!.id, a.id)}
                    >
                      בקש החזרה
                    </button>
                  )}
                  {a.status === 'pending' && (
                    <span style={{ fontSize: '.8rem', color: '#6b7280' }}>ממתין לאישור</span>
                  )}
                  {a.status === 'return_pending' && (
                    <span style={{ fontSize: '.8rem', color: '#92400e' }}>ממתין לאישור מנהל</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function statusLabel(s: string) {
  if (s === 'pending') return 'ממתין לאישור';
  if (s === 'approved') return 'מאושר';
  return 'ממתין לאישור החזרה';
}

function statusClass(s: string) {
  if (s === 'pending') return 'status-pending';
  if (s === 'approved') return 'status-approved';
  return 'status-return-pending';
}
