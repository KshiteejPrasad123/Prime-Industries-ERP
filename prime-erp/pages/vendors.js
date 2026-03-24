import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Toast, useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';

const BLANK = () => ({
  name: '', contact_person: '', phone: '', email: '',
  city: '', payment_terms: '', notes: '', custom_fields: [],
});

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK());
  const [newFieldKey, setNewFieldKey] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast, showToast } = useToast();

  useEffect(() => { loadVendors(); }, []);

  async function loadVendors() {
    setLoading(true);
    const { data } = await supabase
      .from('vendors')
      .select('*, vendor_custom_fields(*)')
      .order('name');
    setVendors(data || []);
    setLoading(false);
  }

  function openForm(v = null) {
    if (v) {
      setForm({
        name: v.name, contact_person: v.contact_person || '',
        phone: v.phone || '', email: v.email || '',
        city: v.city || '', payment_terms: v.payment_terms || '',
        notes: v.notes || '',
        custom_fields: (v.vendor_custom_fields || []).map(f => ({ ...f })),
      });
      setEditing(v.id);
    } else {
      setForm(BLANK());
      setEditing(null);
    }
    setShowForm(true);
    setNewFieldKey('');
  }

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  function addCustomField() {
    if (!newFieldKey.trim()) return;
    setForm(p => ({ ...p, custom_fields: [...p.custom_fields, { key: newFieldKey.trim(), field_key: newFieldKey.trim(), field_value: '', _new: true, id: 'new_' + Date.now() }] }));
    setNewFieldKey('');
  }

  function setCustomVal(id, val) {
    setForm(p => ({ ...p, custom_fields: p.custom_fields.map(f => f.id === id ? { ...f, field_value: val } : f) }));
  }

  function removeCustomField(id) {
    setForm(p => ({ ...p, custom_fields: p.custom_fields.filter(f => f.id !== id) }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        contact_person: form.contact_person || null,
        phone: form.phone || null,
        email: form.email || null,
        city: form.city || null,
        payment_terms: form.payment_terms || null,
        notes: form.notes || null,
      };

      let vendorId = editing;
      if (editing) {
        await supabase.from('vendors').update(payload).eq('id', editing);
        await supabase.from('vendor_custom_fields').delete().eq('vendor_id', editing);
      } else {
        const { data } = await supabase.from('vendors').insert(payload).select().single();
        vendorId = data.id;
      }

      if (form.custom_fields.length > 0) {
        await supabase.from('vendor_custom_fields').insert(
          form.custom_fields.map(f => ({ vendor_id: vendorId, field_key: f.field_key || f.key, field_value: f.field_value }))
        );
      }

      showToast(editing ? 'Vendor updated.' : 'Vendor added.');
      setShowForm(false);
      setEditing(null);
      loadVendors();
    } finally {
      setSaving(false);
    }
  }

  async function deleteVendor(id) {
    if (!window.confirm('Delete this vendor? This cannot be undone.')) return;
    await supabase.from('vendors').delete().eq('id', id);
    showToast('Vendor deleted.');
    loadVendors();
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <div className="page-title">Vendors</div>
          <div className="page-subtitle">Manage your raw material suppliers</div>
        </div>
        <button className="btn btn-primary" onClick={() => openForm()}>+ Add Vendor</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>{editing ? 'Edit Vendor' : 'New Vendor'}</div>
          <form onSubmit={submit}>
            <div className="form-grid form-grid-2">
              <div className="field">
                <label>Vendor Name *</label>
                <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Rathi Steel Pvt. Ltd." required />
              </div>
              <div className="field">
                <label>City / Location</label>
                <input type="text" value={form.city} onChange={e => set('city', e.target.value)} placeholder="e.g. Mumbai" />
              </div>
              <div className="field">
                <label>Contact Person</label>
                <input type="text" value={form.contact_person} onChange={e => set('contact_person', e.target.value)} placeholder="Name" />
              </div>
              <div className="field">
                <label>Phone Number</label>
                <input type="text" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91..." />
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="vendor@email.com" />
              </div>
              <div className="field">
                <label>Payment Terms</label>
                <input type="text" value={form.payment_terms} onChange={e => set('payment_terms', e.target.value)} placeholder="e.g. Net 30, 50% advance" />
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Notes / Remarks</label>
                <input type="text" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes" />
              </div>
            </div>

            {form.custom_fields.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Custom Fields</div>
                {form.custom_fields.map(f => (
                  <div key={f.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--text2)', minWidth: 140, flexShrink: 0 }}>{f.field_key || f.key}</span>
                    <input type="text" style={{ flex: 1 }} value={f.field_value || ''} onChange={e => setCustomVal(f.id, e.target.value)} placeholder="Value" />
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeCustomField(f.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              <input
                type="text"
                style={{ maxWidth: 220 }}
                value={newFieldKey}
                onChange={e => setNewFieldKey(e.target.value)}
                placeholder="New field name (e.g. GST Number)"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomField(); } }}
              />
              <button type="button" className="btn btn-secondary" onClick={addCustomField}>+ Add Field</button>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Vendor'}</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="loading">Loading vendors...</div> : vendors.length === 0 && !showForm ? (
        <div className="card">
          <div className="empty-state">
            <p>No vendors yet.</p>
            <button className="btn btn-primary" onClick={() => openForm()}>Add Your First Vendor</button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>City</th>
                  <th>Contact Person</th>
                  <th>Phone</th>
                  <th>Payment Terms</th>
                  <th>Custom Fields</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {vendors.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 500 }}>{v.name}</td>
                    <td>{v.city || '—'}</td>
                    <td>{v.contact_person || '—'}</td>
                    <td>{v.phone || '—'}</td>
                    <td>{v.payment_terms || '—'}</td>
                    <td>
                      {(v.vendor_custom_fields || []).length > 0
                        ? (v.vendor_custom_fields || []).map(f => (
                          <span key={f.id} className="vendor-chip" style={{ marginRight: 4 }}>
                            {f.field_key}: {f.field_value || '—'}
                          </span>
                        ))
                        : '—'}
                    </td>
                    <td className="actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => openForm(v)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteVendor(v.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Toast message={toast} />
    </Layout>
  );
}
