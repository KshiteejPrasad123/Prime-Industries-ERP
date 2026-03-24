import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Toast, useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';

export default function BOMPage() {
  const [skus, setSkus] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [matVendors, setMatVendors] = useState([]);
  const [bomItems, setBomItems] = useState([]);
  const [selectedSku, setSelectedSku] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ material_id: '', vendor_id: '', quantity: '' });
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: s }, { data: m }, { data: v }, { data: mv }, { data: b }] = await Promise.all([
      supabase.from('skus').select('*').order('category').order('name'),
      supabase.from('raw_materials').select('*').order('name'),
      supabase.from('vendors').select('id, name').order('name'),
      supabase.from('material_vendors').select('*'),
      supabase.from('bom_items').select('*'),
    ]);
    setSkus(s || []);
    setMaterials(m || []);
    setVendors(v || []);
    setMatVendors(mv || []);
    setBomItems(b || []);
    setLoading(false);
  }

  const skuBom = bomItems.filter(b => b.sku_id === selectedSku);
  const usedMaterialIds = skuBom.map(b => b.material_id);
  const unusedMaterials = materials.filter(m => !usedMaterialIds.includes(m.id));

  function getVendorsForMaterial(mid) {
    return matVendors
      .filter(mv => mv.material_id === mid)
      .map(mv => ({ ...mv, vendor: vendors.find(v => v.id === mv.vendor_id) }))
      .filter(mv => mv.vendor);
  }

  function getPrice(materialId, vendorId) {
    const mv = matVendors.find(mv => mv.material_id === materialId && mv.vendor_id === vendorId);
    return mv ? mv.price : null;
  }

  function lineTotal(item) {
    const price = getPrice(item.material_id, item.vendor_id);
    return price !== null ? price * item.quantity : null;
  }

  const totalCost = skuBom.reduce((sum, item) => { const lt = lineTotal(item); return sum + (lt || 0); }, 0);
  const hasMissing = skuBom.some(item => lineTotal(item) === null);

  async function addItem() {
    if (!addForm.material_id || !addForm.vendor_id || !addForm.quantity) return;
    await supabase.from('bom_items').insert({
      sku_id: selectedSku,
      material_id: addForm.material_id,
      vendor_id: addForm.vendor_id,
      quantity: parseFloat(addForm.quantity),
    });
    setAddForm({ material_id: '', vendor_id: '', quantity: '' });
    setShowAdd(false);
    showToast('Material added to BOM.');
    loadAll();
  }

  async function removeItem(id) {
    await supabase.from('bom_items').delete().eq('id', id);
    showToast('Removed from BOM.');
    loadAll();
  }

  async function updateItem(id, field, val) {
    const update = { [field]: field === 'quantity' ? parseFloat(val) || 0 : val };
    await supabase.from('bom_items').update(update).eq('id', id);
    loadAll();
  }

  const selectedSkuData = skus.find(s => s.id === selectedSku);

  return (
    <Layout>
      <div className="page-header">
        <div>
          <div className="page-title">Bill of Materials</div>
          <div className="page-subtitle">Build and manage the raw material composition for each SKU</div>
        </div>
      </div>

      {loading ? <div className="loading">Loading...</div> : (
        <>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="field" style={{ maxWidth: 360 }}>
              <label>Select SKU</label>
              <select value={selectedSku} onChange={e => { setSelectedSku(e.target.value); setShowAdd(false); setAddForm({ material_id: '', vendor_id: '', quantity: '' }); }}>
                <option value="">— Choose a SKU —</option>
                {skus.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.variant ? ` (${s.variant})` : ''}{s.category ? ` · ${s.category}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!selectedSku ? (
            <div className="card">
              <div className="empty-state">
                <p>{skus.length === 0 ? 'Add SKUs first, then build their BOMs here.' : 'Select a SKU above to view or build its BOM.'}</p>
              </div>
            </div>
          ) : (
            <>
              {skuBom.length > 0 && (
                <div className="stat-row">
                  <div className="stat-card">
                    <div className="stat-label">Raw Material Cost / Unit</div>
                    <div className="stat-value" style={{ fontSize: 20 }}>
                      {hasMissing ? '—' : `₹${totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </div>
                    {hasMissing && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>Some lines missing vendor / price</div>}
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Materials</div>
                    <div className="stat-value">{skuBom.length}</div>
                  </div>
                  {selectedSkuData?.category && (
                    <div className="stat-card">
                      <div className="stat-label">Category</div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginTop: 4 }}>{selectedSkuData.category}</div>
                    </div>
                  )}
                </div>
              )}

              {skuBom.length > 0 && (
                <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Raw Material</th>
                          <th>Vendor</th>
                          <th>Qty per Unit</th>
                          <th>Unit</th>
                          <th>₹ / Unit</th>
                          <th>Line Total</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {skuBom.map(item => {
                          const mat = materials.find(m => m.id === item.material_id);
                          const price = getPrice(item.material_id, item.vendor_id);
                          const lt = lineTotal(item);
                          const vendorOpts = getVendorsForMaterial(item.material_id);
                          return (
                            <tr key={item.id}>
                              <td style={{ fontWeight: 500 }}>{mat?.name || '—'}</td>
                              <td style={{ minWidth: 200 }}>
                                <select
                                  value={item.vendor_id || ''}
                                  onChange={e => updateItem(item.id, 'vendor_id', e.target.value)}
                                  style={{ padding: '4px 8px', fontSize: 13, width: '100%' }}
                                >
                                  <option value="">— Select Vendor —</option>
                                  {vendorOpts.map(vo => (
                                    <option key={vo.vendor_id} value={vo.vendor_id}>
                                      {vo.vendor.name} (₹{vo.price.toLocaleString('en-IN')} / {mat?.unit})
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  className="input-sm"
                                  style={{ width: 90 }}
                                  defaultValue={item.quantity}
                                  onBlur={e => updateItem(item.id, 'quantity', e.target.value)}
                                />
                              </td>
                              <td style={{ color: 'var(--text3)' }}>{mat?.unit || '—'}</td>
                              <td>{price !== null ? `₹${price.toLocaleString('en-IN')}` : '—'}</td>
                              <td style={{ fontWeight: 500 }}>
                                {lt !== null
                                  ? `₹${lt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  : <span style={{ color: 'var(--danger)', fontSize: 12 }}>No price</span>
                                }
                              </td>
                              <td className="actions">
                                <button className="btn btn-danger btn-sm" onClick={() => removeItem(item.id)}>Remove</button>
                              </td>
                            </tr>
                          );
                        })}
                        <tr style={{ background: 'var(--bg2)', borderTop: '2px solid var(--border2)' }}>
                          <td colSpan={5} style={{ fontWeight: 600, fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Raw Material Cost</td>
                          <td style={{ fontWeight: 600 }}>
                            {hasMissing ? '—' : `₹${totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {showAdd ? (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 14 }}>Add Material to BOM</div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="field" style={{ flex: 2, minWidth: 180, marginBottom: 0 }}>
                      <label>Raw Material</label>
                      <select value={addForm.material_id} onChange={e => setAddForm(p => ({ ...p, material_id: e.target.value, vendor_id: '' }))}>
                        <option value="">— Select Material —</option>
                        {unusedMaterials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                      </select>
                    </div>
                    <div className="field" style={{ flex: 2, minWidth: 180, marginBottom: 0 }}>
                      <label>Vendor</label>
                      <select value={addForm.vendor_id} onChange={e => setAddForm(p => ({ ...p, vendor_id: e.target.value }))} disabled={!addForm.material_id}>
                        <option value="">— Select Vendor —</option>
                        {(addForm.material_id ? getVendorsForMaterial(addForm.material_id) : []).map(vo => (
                          <option key={vo.vendor_id} value={vo.vendor_id}>
                            {vo.vendor.name} — ₹{vo.price.toLocaleString('en-IN')} / {materials.find(m => m.id === addForm.material_id)?.unit}
                          </option>
                        ))}
                      </select>
                      {addForm.material_id && getVendorsForMaterial(addForm.material_id).length === 0 && (
                        <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>No vendors linked to this material. Go to Raw Materials to link vendors first.</div>
                      )}
                    </div>
                    <div className="field" style={{ flex: 1, minWidth: 100, marginBottom: 0 }}>
                      <label>Qty per Unit</label>
                      <input type="number" min="0" step="0.001" value={addForm.quantity} onChange={e => setAddForm(p => ({ ...p, quantity: e.target.value }))} placeholder="0" />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary" onClick={addItem} disabled={!addForm.material_id || !addForm.vendor_id || !addForm.quantity}>Add</button>
                      <button className="btn btn-secondary" onClick={() => { setShowAdd(false); setAddForm({ material_id: '', vendor_id: '', quantity: '' }); }}>Cancel</button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed' }}
                  onClick={() => setShowAdd(true)}
                >
                  + Add Raw Material to BOM
                </button>
              )}

              {skuBom.length === 0 && !showAdd && (
                <div className="card" style={{ marginTop: 16 }}>
                  <div className="empty-state">
                    <p>No materials in this BOM yet. Use the button above to start building it.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
      <Toast message={toast} />
    </Layout>
  );
}
