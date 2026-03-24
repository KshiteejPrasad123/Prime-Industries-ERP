import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Toast, useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';

const BLANK = () => ({ name: '', category: '', variant: '', description: '' });

export default function SKUsPage() {
  const [skus, setSkus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK());
  const [saving, setSaving] = useState(false);
  const { toast, showToast } = useToast();

  useEffect(() => { loadSKUs(); }, []);

  async function loadSKUs() {
    setLoading(true);
    const { data } = await supabase.from('skus').select('*').order('category').order('name');
    setSkus(data || []);
    setLoading(false);
  }

  function openForm(s = null) {
    setForm(s ? { name: s.name, category: s.category || '', variant: s.variant || '', description: s.description || '' } : BLANK());
    setEditing(s ? s.id : null);
    setShowForm(true);
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim() || null,
        variant: form.variant.trim() || null,
        description: form.description.trim() || null,
      };
      if (editing) {
        await supabase.from('skus').update(payload).eq('id', editing);
        showToast('SKU updated.');
      } else {
        await supabase.from('skus').insert(payload);
        showToast('SKU added.');
      }
      setShowForm(false);
      setEditing(null);
      loadSKUs();
    } finally {
      setSaving(false);
    }
  }

  async function deleteSKU(id) {
    if (!window.confirm('Delete this SKU? Its BOM will also be removed.')) return;
    await supabase.from('skus').delete().eq('id', id);
    showToast('SKU deleted.');
    loadSKUs();
  }

  // Group by category for display
  const grouped = skus.reduce((acc, s) => {
    const cat = s.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <Layout>
      <div className="page-header">
        <div>
          <div className="page-title">SKUs</div>
          <div className="page-subtitle">Manage your finished product catalogue</div>
        </div>
        <button className="btn btn-primary" onClick={() => openForm()}>+ Add SKU</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>{editing ? 'Edit SKU' : 'New SKU'}</div>
          <form onSubmit={submit}>
            <div className="form-grid form-grid-2">
              <div className="field">
                <label>Product Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Triply Honeycomb Kadai" required />
              </div>
              <div className="field">
                <label>Category</label>
                <input type="text" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Triply Stainless Steel, Non-stick" />
              </div>
              <div className="field">
                <label>Size / Variant</label>
                <input type="text" value={form.variant} onChange={e => setForm(p => ({ ...p, variant: e.target.value }))} placeholder="e.g. 24 cm, 2.5 L" />
              </div>
              <div className="field">
                <label>Description</label>
                <input type="text" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Add SKU'}</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="loading">Loading SKUs...</div> : skus.length === 0 && !showForm ? (
        <div className="card">
          <div className="empty-state">
            <p>No SKUs yet.</p>
            <button className="btn btn-primary" onClick={() => openForm()}>Add Your First SKU</button>
          </div>
        </div>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {category}
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Size / Variant</th>
                      <th>Description</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 500 }}>{s.name}</td>
                        <td>{s.variant || '—'}</td>
                        <td style={{ color: 'var(--text2)' }}>{s.description || '—'}</td>
                        <td className="actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => openForm(s)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteSKU(s.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))
      )}
      <Toast message={toast} />
    </Layout>
  );
}
