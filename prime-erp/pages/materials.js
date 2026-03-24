import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Toast, useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';

const BLANK = () => ({ material_id: '', name: '', unit: '', notes: '' });

export default function MaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [matVendors, setMatVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK());
  const [expanded, setExpanded] = useState(null);
  const [vpForm, setVpForm] = useState({ vendor_id: '', price: '' });
  const [showVpForm, setShowVpForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast, showToast } = useToast();

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: mats }, { data: vens }, { data: mvs }] = await Promise.all([
      supabase.from('raw_materials').select('*').order('name'),
      supabase.from('vendors').select('id, name, vendor_id').order('name'),
      supabase.from('material_vendors').select('*, vendors(name, vendor_id)'),
    ]);
    setMaterials(mats || []);
    setVendors(vens || []);
    setMatVendors(mvs || []);
    setLoading(false);
  }

  function openForm(m = null) {
    setForm(m ? { material_id: m.material_id || '', name: m.name, unit: m.unit, notes: m.notes || '' } : BLANK());
    setEditing(m ? m.id : null);
    setShowForm(true);
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.unit.trim()) return;
    setSaving(true);
    try {
      const payload = {
        material_id: form.material_id.trim() || null,
        name: form.name.trim(),
        unit: form.unit.trim(),
        notes: form.notes || null,
      };
      if (editing) {
        await supabase.from('raw_materials').update(payload).eq('id', editing);
        showToast('Material updated.');
      } else {
        await supabase.from('raw_materials').insert(payload);
        showToast('Material added.');
      }
      setShowForm(false);
      setEditing(null);
      loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function deleteMaterial(id) {
    if (!window.confirm('Delete this material? Its vendor links and BOM entries will also be removed.')) return;
    await supabase.from('raw_materials').delete().eq('id', id);
    showToast('Material deleted.');
    loadAll();
  }

  function mvForMaterial(mid) { return matVendors.filter(mv => mv.material_id === mid); }
  function unlinkedVendors(mid) { return vendors.filter(v => !mvForMaterial(mid).find(mv => mv.vendor_id === v.id)); }

  async function addVendorLink(materialId) {
    if (!vpForm.vendor_id || !vpForm.price) return;
    await supabase.from('material_vendors').insert({ material_id: materialId, vendor_id: vpForm.vendor_id, price: parseFloat(vpForm.price) });
    setVpForm({ vendor_id: '', price: '' });
    setShowVpForm(null);
    showToast('Vendor linked.');
    loadAll();
  }

  async function removeVendorLink(id) {
    await supabase.from('material_vendors').delete().eq('id', id);
    showToast('Vendor removed.');
    loadAll();
  }

  async function updateVendorPrice(id, price) {
    await supabase.from('material_vendors').update({ price: parseFloat(price) || 0 }).eq('id', id);
    loadAll();
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <div className="page-title">Raw Materials</div>
          <div className="page-subtitle">Manage materials and link vendors with pricing</div>
        </div>
        <button className="btn btn-primary" onClick={() => openForm()}>+ Add Material</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>{editing ? 'Edit Material' : 'New Raw Material'}</div>
          <form onSubmit={submit}>
            <div className="form-grid form-grid-2">
              <div className="field">
                <label>Material ID</label>
                <input type="text" value={form.material_id} onChange={e => setForm(p => ({ ...p, material_id: e.target.value }))} placeholder="e.g. MAT-001, SS-COIL-304" />
              </div>
              <div className="field">
                <label>Material Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Stainless Steel Coil" required />
              </div>
              <div className="field">
                <label>Unit *</label>
                <input type="text" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="e.g. kg, pieces, meters" required />
              </div>
              <div className="field">
                <label>Notes (grade, spec, etc.)</label>
                <input type="text" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Material'}</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="loading">Loading materials...</div> : materials.length === 0 && !showForm ? (
        <div className="card">
          <div className="empty-state">
            <p>No raw materials yet.</p>
            <button className="btn btn-primary" onClick={() => openForm()}>Add Your First Material</button>
          </div>
        </div>
      ) : (
        <div>
          {materials.map(m => {
            const mvs = mvForMaterial(m.id);
            const unlinked = unlinkedVendors(m.id);
            const isOpen = expanded === m.id;
            const lowestPrice = mvs.length > 0 ? Math.min(...mvs.map(mv => mv.price)) : null;

            return (
              <div key={m.id} className="accordion-row">
                <div className="accordion-header" onClick={() => setExpanded(isOpen ? null : m.id)}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                    {m.material_id && (
                      <span style={{ fontFamily: 'monospace', fontSize: 11, background: 'var(--bg3)', padding: '2px 7px', borderRadius: 4, color: 'var(--text3)', flexShrink: 0 }}>{m.material_id}</span>
                    )}
                    <span style={{ fontWeight: 500 }}>{m.name}</span>
                    <span style={{ color: 'var(--text3)', fontSize: 12 }}>({m.unit})</span>
                    {m.notes && <span style={{ color: 'var(--text3)', fontSize: 12 }}>· {m.notes}</span>}
                  </div>
                  {mvs.length > 0
                    ? <span className="badge">{mvs.length} vendor{mvs.length !== 1 ? 's' : ''} · from ₹{lowestPrice.toLocaleString('en-IN')} / {m.unit}</span>
                    : <span className="badge badge-warn">No vendors linked</span>
                  }
                  <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {isOpen && (
                  <div className="accordion-body">
                    {mvs.length > 0 && (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 14 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vendor</th>
                            <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>₹ / {m.unit}</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {mvs.map(mv => (
                            <tr key={mv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '8px 10px' }}>
                                {mv.vendors?.vendor_id && (
                                  <span style={{ fontFamily: 'monospace', fontSize: 11, background: 'var(--bg3)', padding: '2px 6px', borderRadius: 4, color: 'var(--text3)', marginRight: 6 }}>{mv.vendors.vendor_id}</span>
                                )}
                                {mv.vendors?.name || 'Unknown'}
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ color: 'var(--text2)' }}>₹</span>
                                  <input type="number" min="0" step="0.01" className="input-sm" style={{ width: 100 }} defaultValue={mv.price} onBlur={e => updateVendorPrice(mv.id, e.target.value)} />
                                </div>
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                <button className="btn btn-danger btn-sm" onClick={() => removeVendorLink(mv.id)}>Remove</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {showVpForm === m.id ? (
                      <div className="inline-add">
                        <div className="field" style={{ flex: 2, minWidth: 160, marginBottom: 0 }}>
                          <label>Vendor</label>
                          <select value={vpForm.vendor_id} onChange={e => setVpForm(p => ({ ...p, vendor_id: e.target.value }))}>
                            <option value="">— Select Vendor —</option>
                            {unlinked.map(v => <option key={v.id} value={v.id}>{v.vendor_id ? `[${v.vendor_id}] ` : ''}{v.name}</option>)}
                          </select>
                        </div>
                        <div className="field" style={{ flex: 1, minWidth: 110, marginBottom: 0 }}>
                          <label>Price (₹ / {m.unit})</label>
                          <input type="number" min="0" step="0.01" value={vpForm.price} onChange={e => setVpForm(p => ({ ...p, price: e.target.value }))} placeholder="0.00" />
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-end' }}>
                          <button className="btn btn-primary" onClick={() => addVendorLink(m.id)}>Add</button>
                          <button className="btn btn-secondary" onClick={() => { setShowVpForm(null); setVpForm({ vendor_id: '', price: '' }); }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-secondary" onClick={() => setShowVpForm(m.id)} disabled={unlinked.length === 0}>
                          {unlinked.length === 0 ? 'All Vendors Linked' : '+ Link Vendor'}
                        </button>
                        <button className="btn btn-ghost" onClick={() => openForm(m)}>Edit Material</button>
                        <button className="btn btn-danger" onClick={() => deleteMaterial(m.id)}>Delete</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <Toast message={toast} />
    </Layout>
  );
}
