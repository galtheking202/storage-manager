import { useState } from 'react';
import { useStore } from '../store';

type ManagerTab = 'setup' | 'inventory' | 'users' | 'approvals';

export default function ManagerPage() {
  const [tab, setTab] = useState<ManagerTab>('setup');
  const { users } = useStore();

  const pendingCount = users
    .flatMap((u) => u.acquisitions)
    .filter((a) => a.status === 'pending' || a.status === 'return_pending').length;

  return (
    <div className="page">
      <h1 className="page-title">ניהול מחסן</h1>
      <div className="inner-tabs">
        {(
          [
            { key: 'setup', label: 'הגדרת מלאי' },
            { key: 'inventory', label: 'טבלת מלאי' },
            { key: 'users', label: 'טבלת משתמשים' },
            { key: 'approvals', label: 'אישורים' },
          ] as { key: ManagerTab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            className={`inner-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === 'approvals' && pendingCount > 0 && (
              <span className="tab-badge">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'setup' && <SetupTab />}
      {tab === 'inventory' && <InventoryTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'approvals' && <ApprovalsTab />}
    </div>
  );
}

/* ── הגדרת מלאי ── */
function SetupTab() {
  const { items, addItem, updateItemAmount, updateItemNotes, deleteItem } = useStore();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState(1);
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setMsg({ type: 'error', text: 'נדרש שם מוצר' }); return; }
    if (!category.trim()) { setMsg({ type: 'error', text: 'נדרשת קטגוריה' }); return; }
    if (amount < 1) { setMsg({ type: 'error', text: 'כמות חייבת להיות לפחות 1' }); return; }
    addItem(name.trim(), amount, category.trim(), notes.trim());
    setName(''); setCategory(''); setAmount(1); setNotes('');
    setMsg({ type: 'success', text: 'המוצר נוסף למלאי בהצלחה' });
    setTimeout(() => setMsg(null), 3000);
  }

  return (
    <>
      <div className="card">
        <h3>הוספת מוצר חדש</h3>
        {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
        <form onSubmit={handleAdd}>
          <div className="form-row">
            <div className="form-group">
              <label>שם מוצר</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם המוצר" />
            </div>
            <div className="form-group">
              <label>קטגוריה</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="קטגוריה" />
            </div>
            <div className="form-group" style={{ maxWidth: 110 }}>
              <label>כמות</label>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>הערות</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="הערות (אופציונלי)"
              />
            </div>
            <div className="form-action">
              <button type="submit" className="btn btn-primary">+ הוסף</button>
            </div>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>ניהול מלאי קיים ({items.length} פריטים)</h3>
        <table>
          <thead>
            <tr>
              <th>שם מוצר</th>
              <th>קטגוריה</th>
              <th>כמות כוללת</th>
              <th>הערות</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={5} className="empty-row">אין מוצרים במלאי</td></tr>
            )}
            {items.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.name}</strong></td>
                <td><span className="badge">{item.category}</span></td>
                <td>
                  <div className="action-row">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => updateItemAmount(item.id, -1)}
                      disabled={item.totalAmount <= 0}
                    >
                      −
                    </button>
                    <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 600 }}>
                      {item.totalAmount}
                    </span>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => updateItemAmount(item.id, 1)}
                    >
                      +
                    </button>
                  </div>
                </td>
                <td>
                  <input
                    value={item.notes}
                    onChange={(e) => updateItemNotes(item.id, e.target.value)}
                    placeholder="הערות..."
                    style={{ fontSize: '.85rem', padding: '.25rem .5rem', minWidth: 160 }}
                  />
                </td>
                <td>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => deleteItem(item.id)}
                  >
                    מחק
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ── טבלת מלאי ── */
function InventoryTab() {
  const { items } = useStore();

  return (
    <div className="card">
      <h3>טבלת מלאי</h3>
      <table>
        <thead>
          <tr>
            <th>קטגוריה</th>
            <th>שם המוצר</th>
            <th>כמות</th>
            <th>כמות בשימוש</th>
            <th>כמות במלאי</th>
            <th>הערות</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr><td colSpan={6} className="empty-row">אין מוצרים</td></tr>
          )}
          {items.map((item) => {
            const inUse = item.totalAmount - item.available;
            const pct = item.totalAmount > 0 ? item.available / item.totalAmount : 0;
            const cls = pct > 0.5 ? 'good' : pct > 0.2 ? 'warn' : 'low';
            return (
              <tr key={item.id}>
                <td><span className="badge">{item.category}</span></td>
                <td><strong>{item.name}</strong></td>
                <td>{item.totalAmount}</td>
                <td>{inUse}</td>
                <td>
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${cls}`}
                      style={{ width: `${Math.round(pct * 100)}%` }}
                    />
                  </div>
                  <span className="pct-label">{item.available}</span>
                </td>
                <td style={{ color: '#6b7280', fontSize: '.85rem' }}>{item.notes || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── טבלת משתמשים ── */
function UsersTab() {
  const { users } = useStore();
  const allAcqs = users.flatMap((u) =>
    u.acquisitions.map((a) => ({ ...a, userName: u.name }))
  );

  return (
    <div className="card">
      <h3>טבלת משתמשים ({allAcqs.length} פריטים מושאלים)</h3>
      <table>
        <thead>
          <tr>
            <th>שם החייל</th>
            <th>מוצר</th>
            <th>כמות</th>
            <th>תאריך חתימה</th>
            <th>סוג השאלה</th>
            <th>פרטי משימה</th>
            <th>סטטוס</th>
          </tr>
        </thead>
        <tbody>
          {allAcqs.length === 0 && (
            <tr><td colSpan={7} className="empty-row">אין פריטים מושאלים</td></tr>
          )}
          {allAcqs.map((a) => (
            <tr key={a.id}>
              <td><strong>{a.userName}</strong></td>
              <td>{a.itemName}</td>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── אישורים ── */
function ApprovalsTab() {
  const { users, approveAcquisition, approveReturn } = useStore();

  const pending = users.flatMap((u) =>
    u.acquisitions
      .filter((a) => a.status === 'pending')
      .map((a) => ({ ...a, userName: u.name, userId: u.id }))
  );
  const returnPending = users.flatMap((u) =>
    u.acquisitions
      .filter((a) => a.status === 'return_pending')
      .map((a) => ({ ...a, userName: u.name, userId: u.id }))
  );

  return (
    <div className="page">
      <div className="card">
        <h3>בקשות השאלה ממתינות לאישור ({pending.length})</h3>
        {pending.length === 0 ? (
          <p className="empty-note">אין בקשות השאלה ממתינות</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>שם החייל</th>
                <th>מוצר</th>
                <th>כמות</th>
                <th>תאריך בקשה</th>
                <th>סוג השאלה</th>
                <th>פרטי משימה</th>
                <th>פעולה</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((a) => (
                <tr key={a.id}>
                  <td><strong>{a.userName}</strong></td>
                  <td>{a.itemName}</td>
                  <td>{a.amount}</td>
                  <td>{a.acquiredAt}</td>
                  <td>
                    <span className={`status-badge ${a.loanType === 'permanent' ? 'loan-permanent' : 'loan-temporary'}`}>
                      {a.loanType === 'permanent' ? 'קבועה' : 'זמנית'}
                    </span>
                  </td>
                  <td style={{ fontSize: '.85rem' }}>
                    {a.loanType === 'temporary'
                      ? `${a.missionName ?? ''}${a.returnDate ? ` | עד ${a.returnDate}` : ''}`
                      : '—'}
                  </td>
                  <td>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => approveAcquisition(a.userId, a.id)}
                    >
                      אשר ✓
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>בקשות החזרה ממתינות לאישור ({returnPending.length})</h3>
        {returnPending.length === 0 ? (
          <p className="empty-note">אין בקשות החזרה ממתינות</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>שם החייל</th>
                <th>מוצר</th>
                <th>כמות</th>
                <th>תאריך השאלה מקורי</th>
                <th>פעולה</th>
              </tr>
            </thead>
            <tbody>
              {returnPending.map((a) => (
                <tr key={a.id}>
                  <td><strong>{a.userName}</strong></td>
                  <td>{a.itemName}</td>
                  <td>{a.amount}</td>
                  <td>{a.acquiredAt}</td>
                  <td>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => approveReturn(a.userId, a.id)}
                    >
                      אשר החזרה ✓
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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
