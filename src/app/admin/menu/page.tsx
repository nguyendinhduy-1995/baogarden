'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/* ─── Types ─── */
interface Category { id: string; name: string; departmentDefault: string; sortOrder: number; isActive: boolean; _count?: { items: number } }
interface MenuItem {
  id: string; name: string; slug: string; description: string | null; price: number;
  imageUrl: string | null; categoryId: string; department: string;
  isAvailable: boolean; isFeatured: boolean; preparationTimeMinutes: number;
  sortOrder: number; category: { id: string; name: string };
}

const DEPARTMENTS = [
  { value: 'KITCHEN', label: 'Bếp' },
  { value: 'BAR', label: 'Bar' },
  { value: 'SERVICE', label: 'Phục vụ' },
  { value: 'OTHER', label: 'Khác' },
];

function fmtMoney(n: number) { return new Intl.NumberFormat('vi-VN').format(n) + 'đ'; }
const DEPT_LABEL = (d: string) => DEPARTMENTS.find(x => x.value === d)?.label || d;

const EMPTY_FORM = {
  name: '', description: '', price: '', categoryId: '', department: 'KITCHEN',
  isAvailable: true, isFeatured: false, preparationTimeMinutes: '15', sortOrder: '0', imageUrl: '',
};

export default function AdminMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showCatSection, setShowCatSection] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', departmentDefault: 'KITCHEN', sortOrder: '0' });
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catSaving, setCatSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [itemsRes, catsRes] = await Promise.all([
        fetch('/api/menu/items'),
        fetch('/api/menu/categories'),
      ]);
      if (itemsRes.ok) { const d = await itemsRes.json(); if (d.success) setItems(d.data); }
      if (catsRes.ok) { const d = await catsRes.json(); if (d.success) setCategories(d.data); }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Item form
  const openAddItem = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setShowItemModal(true);
  };

  const openEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setForm({
      name: item.name, description: item.description || '', price: String(Number(item.price)),
      categoryId: item.categoryId, department: item.department,
      isAvailable: item.isAvailable, isFeatured: item.isFeatured,
      preparationTimeMinutes: String(item.preparationTimeMinutes),
      sortOrder: String(item.sortOrder), imageUrl: item.imageUrl || '',
    });
    setShowItemModal(true);
  };

  const saveItem = async () => {
    if (!form.name.trim() || !form.categoryId || !form.price) {
      showToast('Vui lòng điền đầy đủ thông tin', 'error');
      return;
    }
    setSaving(true);
    try {
      const url = editingItem ? `/api/menu/items/${editingItem.id}` : '/api/menu/items';
      const method = editingItem ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          price: Number(form.price),
          categoryId: form.categoryId,
          department: form.department,
          isAvailable: form.isAvailable,
          isFeatured: form.isFeatured,
          preparationTimeMinutes: Number(form.preparationTimeMinutes) || 15,
          sortOrder: Number(form.sortOrder) || 0,
          imageUrl: form.imageUrl.trim() || null,
        }),
      });
      if (res.ok) {
        showToast(editingItem ? 'Cập nhật thành công' : 'Thêm món thành công');
        setShowItemModal(false);
        loadData();
      } else {
        const d = await res.json();
        showToast(d.error || 'Lỗi', 'error');
      }
    } catch { showToast('Lỗi kết nối', 'error'); }
    setSaving(false);
  };

  // Toggle available/featured
  const toggleField = async (item: MenuItem, field: 'isAvailable' | 'isFeatured') => {
    try {
      const res = await fetch(`/api/menu/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !item[field] }),
      });
      if (res.ok) { loadData(); showToast('Đã cập nhật'); }
    } catch { showToast('Lỗi', 'error'); }
  };

  // Delete item
  const deleteItem = async (item: MenuItem) => {
    if (!confirm(`Xóa món "${item.name}"?`)) return;
    try {
      const res = await fetch(`/api/menu/items/${item.id}`, { method: 'DELETE' });
      if (res.ok) { showToast('Đã xóa'); loadData(); }
      else { const d = await res.json(); showToast(d.error || 'Lỗi xóa', 'error'); }
    } catch { showToast('Lỗi', 'error'); }
  };

  // Category management
  const saveCat = async () => {
    if (!catForm.name.trim()) { showToast('Tên danh mục bắt buộc', 'error'); return; }
    setCatSaving(true);
    try {
      const url = editingCat ? `/api/menu/categories/${editingCat.id}` : '/api/menu/categories';
      const method = editingCat ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: catForm.name.trim(),
          departmentDefault: catForm.departmentDefault,
          sortOrder: Number(catForm.sortOrder) || 0,
        }),
      });
      if (res.ok) {
        showToast(editingCat ? 'Cập nhật danh mục' : 'Thêm danh mục');
        setCatForm({ name: '', departmentDefault: 'KITCHEN', sortOrder: '0' });
        setEditingCat(null);
        loadData();
      } else { const d = await res.json(); showToast(d.error || 'Lỗi', 'error'); }
    } catch { showToast('Lỗi', 'error'); }
    setCatSaving(false);
  };

  const editCat = (cat: Category) => {
    setEditingCat(cat);
    setCatForm({ name: cat.name, departmentDefault: cat.departmentDefault, sortOrder: String(cat.sortOrder) });
    setShowCatSection(true);
  };

  // Filter
  const filtered = items.filter(i => {
    if (filterCat !== 'all' && i.categoryId !== filterCat) return false;
    if (filterDept !== 'all' && i.department !== filterDept) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return (
    <div className="mn-page">
      <style>{CSS}</style>
      <div className="mn-skel-header"><div className="mn-skel mn-skel-title" /><div className="mn-skel mn-skel-btn" /></div>
      <div className="mn-skel-grid">{[1,2,3,4,5,6].map(i => <div key={i} className="mn-skel mn-skel-card" />)}</div>
    </div>
  );

  return (
    <div className="mn-page">
      <style>{CSS}</style>

      {toast && <div className={`mn-toast mn-toast-${toast.type}`}>{toast.msg}</div>}

      {/* Header */}
      <div className="mn-header">
        <div>
          <h1 className="mn-title">Quản lý thực đơn</h1>
          <p className="mn-subtitle">{items.length} món · {categories.length} danh mục</p>
        </div>
        <div className="mn-header-actions">
          <button className="mn-btn-cat" onClick={() => setShowCatSection(!showCatSection)}>
            {showCatSection ? '✕ Đóng danh mục' : 'Danh mục'}
          </button>
          <button className="mn-btn-add" onClick={openAddItem}>+ Thêm món</button>
        </div>
      </div>

      {/* Category management */}
      {showCatSection && (
        <div className="mn-cat-section">
          <h3 className="mn-cat-title">Quản lý danh mục</h3>
          <div className="mn-cat-form">
            <input className="mn-input" placeholder="Tên danh mục" value={catForm.name}
              onChange={e => setCatForm({ ...catForm, name: e.target.value })} />
            <select className="mn-select" value={catForm.departmentDefault}
              onChange={e => setCatForm({ ...catForm, departmentDefault: e.target.value })}>
              {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <input className="mn-input mn-input-narrow" type="number" placeholder="Thứ tự" value={catForm.sortOrder}
              onChange={e => setCatForm({ ...catForm, sortOrder: e.target.value })} />
            <button className="mn-cat-save" onClick={saveCat} disabled={catSaving}>
              {catSaving ? '...' : editingCat ? 'Cập nhật' : 'Thêm'}
            </button>
            {editingCat && (
              <button className="mn-cat-cancel" onClick={() => { setEditingCat(null); setCatForm({ name: '', departmentDefault: 'KITCHEN', sortOrder: '0' }); }}>
                Hủy
              </button>
            )}
          </div>
          <div className="mn-cat-list">
            {categories.map(cat => (
              <div key={cat.id} className="mn-cat-item">
                <span className="mn-cat-name">{cat.name}</span>
                <span className="mn-cat-dept">{DEPT_LABEL(cat.departmentDefault)}</span>
                <span className="mn-cat-count">{cat._count?.items || 0} món</span>
                <button className="mn-cat-edit" onClick={() => editCat(cat)}>Sửa</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mn-filters">
        <input className="mn-input mn-search" type="text" placeholder="Tìm kiếm..." value={search}
          onChange={e => setSearch(e.target.value)} />
        <select className="mn-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="all">Tất cả danh mục</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="mn-select" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="all">Tất cả bộ phận</option>
          {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </div>

      {/* Desktop table */}
      <div className="mn-table-wrap mn-hide-mobile">
        <table className="mn-table">
          <thead>
            <tr>
              <th>Tên món</th>
              <th>Danh mục</th>
              <th>Giá</th>
              <th>Bộ phận</th>
              <th>Khả dụng</th>
              <th>Nổi bật</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id}>
                <td>
                  <div className="mn-item-name">{item.name}</div>
                  {item.description && <div className="mn-item-desc">{item.description}</div>}
                </td>
                <td><span className="mn-badge mn-badge-gold">{item.category.name}</span></td>
                <td className="mn-item-price">{fmtMoney(Number(item.price))}</td>
                <td><span className="mn-badge mn-badge-gray">{DEPT_LABEL(item.department)}</span></td>
                <td>
                  <button className={`mn-toggle ${item.isAvailable ? 'mn-toggle-on' : ''}`}
                    onClick={() => toggleField(item, 'isAvailable')}>
                    <span className="mn-toggle-dot" />
                  </button>
                </td>
                <td>
                  <button className={`mn-toggle ${item.isFeatured ? 'mn-toggle-on' : ''}`}
                    onClick={() => toggleField(item, 'isFeatured')}>
                    <span className="mn-toggle-dot" />
                  </button>
                </td>
                <td>
                  <div className="mn-actions">
                    <button className="mn-act-edit" onClick={() => openEditItem(item)}>Sửa</button>
                    <button className="mn-act-del" onClick={() => deleteItem(item)}>Xóa</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="mn-empty">Không tìm thấy món nào</div>}
      </div>

      {/* Mobile cards */}
      <div className="mn-cards mn-show-mobile">
        {filtered.map(item => (
          <div key={item.id} className="mn-card">
            <div className="mn-card-top">
              <div className="mn-card-info">
                <span className="mn-card-name">{item.name}</span>
                <span className="mn-card-cat">{item.category.name}</span>
              </div>
              <span className="mn-card-price">{fmtMoney(Number(item.price))}</span>
            </div>
            <div className="mn-card-meta">
              <span className="mn-badge mn-badge-gray">{DEPT_LABEL(item.department)}</span>
              <div className="mn-card-toggles">
                <span className="mn-card-toggle-label">Khả dụng</span>
                <button className={`mn-toggle mn-toggle-sm ${item.isAvailable ? 'mn-toggle-on' : ''}`}
                  onClick={() => toggleField(item, 'isAvailable')}>
                  <span className="mn-toggle-dot" />
                </button>
                <span className="mn-card-toggle-label">Nổi bật</span>
                <button className={`mn-toggle mn-toggle-sm ${item.isFeatured ? 'mn-toggle-on' : ''}`}
                  onClick={() => toggleField(item, 'isFeatured')}>
                  <span className="mn-toggle-dot" />
                </button>
              </div>
            </div>
            <div className="mn-card-actions">
              <button className="mn-act-edit mn-act-full" onClick={() => openEditItem(item)}>Sửa</button>
              <button className="mn-act-del" onClick={() => deleteItem(item)}>Xóa</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="mn-empty">Không tìm thấy món nào</div>}
      </div>

      {/* Item modal */}
      {showItemModal && (
        <div className="mn-modal-overlay" onClick={e => e.target === e.currentTarget && setShowItemModal(false)}>
          <div className="mn-modal">
            <div className="mn-modal-header">
              <h2>{editingItem ? 'Sửa món' : 'Thêm món mới'}</h2>
              <button className="mn-modal-close" onClick={() => setShowItemModal(false)}>✕</button>
            </div>
            <div className="mn-modal-body">
              <div className="mn-form-group">
                <label className="mn-label">Tên món *</label>
                <input className="mn-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Tên món" />
              </div>
              <div className="mn-form-group">
                <label className="mn-label">Mô tả</label>
                <textarea className="mn-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Mô tả món ăn" rows={2} />
              </div>
              <div className="mn-form-row">
                <div className="mn-form-group">
                  <label className="mn-label">Giá *</label>
                  <input className="mn-input" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0" />
                </div>
                <div className="mn-form-group">
                  <label className="mn-label">Danh mục *</label>
                  <select className="mn-select" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                    <option value="">Chọn danh mục</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="mn-form-row">
                <div className="mn-form-group">
                  <label className="mn-label">Bộ phận</label>
                  <select className="mn-select" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                    {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div className="mn-form-group">
                  <label className="mn-label">Thời gian (phút)</label>
                  <input className="mn-input" type="number" value={form.preparationTimeMinutes}
                    onChange={e => setForm({ ...form, preparationTimeMinutes: e.target.value })} />
                </div>
              </div>
              <div className="mn-form-row">
                <div className="mn-form-group">
                  <label className="mn-label">Thứ tự</label>
                  <input className="mn-input" type="number" value={form.sortOrder}
                    onChange={e => setForm({ ...form, sortOrder: e.target.value })} />
                </div>
                <div className="mn-form-group">
                  <label className="mn-label">URL hình ảnh</label>
                  <input className="mn-input" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <div className="mn-form-row">
                <label className="mn-checkbox">
                  <input type="checkbox" checked={form.isAvailable} onChange={e => setForm({ ...form, isAvailable: e.target.checked })} />
                  <span>Khả dụng</span>
                </label>
                <label className="mn-checkbox">
                  <input type="checkbox" checked={form.isFeatured} onChange={e => setForm({ ...form, isFeatured: e.target.checked })} />
                  <span>Nổi bật</span>
                </label>
              </div>
            </div>
            <div className="mn-modal-footer">
              <button className="mn-btn-cancel" onClick={() => setShowItemModal(false)}>Hủy</button>
              <button className="mn-btn-save" onClick={saveItem} disabled={saving}>
                {saving ? 'Đang lưu...' : editingItem ? 'Cập nhật' : 'Thêm mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CSS = `
/* ═══ Admin Menu ═══ */
.mn-page{animation:mn-in 0.25s ease}
@keyframes mn-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

/* Toast */
.mn-toast{position:fixed;top:16px;right:16px;z-index:2000;padding:12px 20px;border-radius:10px;font-size:0.85rem;font-weight:600;animation:mn-toastin 0.3s ease;box-shadow:0 8px 30px rgba(0,0,0,0.5);max-width:320px}
.mn-toast-success{background:#14532d;color:#4ade80;border:1px solid rgba(74,222,128,0.2)}
.mn-toast-error{background:#450a0a;color:#f87171;border:1px solid rgba(239,68,68,0.2)}
@keyframes mn-toastin{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}

/* Skeleton */
.mn-skel{background:var(--bg-tertiary);border-radius:8px;animation:mn-pulse 1.5s ease infinite}
@keyframes mn-pulse{0%,100%{opacity:0.5}50%{opacity:0.2}}
.mn-skel-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.mn-skel-title{width:200px;height:28px}
.mn-skel-btn{width:100px;height:36px}
.mn-skel-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
.mn-skel-card{height:120px;border-radius:12px}

/* Header */
.mn-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;gap:12px;flex-wrap:wrap}
.mn-title{font-size:1.4rem;font-weight:800;letter-spacing:-0.02em;color:var(--text-primary)}
.mn-subtitle{font-size:0.82rem;color:var(--text-tertiary);margin-top:2px}
.mn-header-actions{display:flex;gap:8px}
.mn-btn-add{padding:9px 18px;border-radius:10px;font-size:0.82rem;font-weight:600;background:var(--gold-400);color:var(--bg-primary);cursor:pointer;font-family:inherit;white-space:nowrap;border:none;min-height:44px}
.mn-btn-add:hover{opacity:0.85}
.mn-btn-cat{padding:9px 18px;border-radius:10px;font-size:0.82rem;font-weight:600;background:var(--bg-tertiary);border:1px solid var(--border-default);color:var(--text-secondary);cursor:pointer;font-family:inherit;white-space:nowrap;min-height:44px}
.mn-btn-cat:hover{border-color:var(--gold-400);color:var(--text-primary)}

/* Category section */
.mn-cat-section{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:14px;padding:16px;margin-bottom:20px;animation:mn-in 0.2s}
.mn-cat-title{font-size:0.9rem;font-weight:700;color:var(--text-primary);margin-bottom:12px}
.mn-cat-form{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.mn-cat-save{padding:8px 16px;border-radius:8px;font-size:0.78rem;font-weight:600;background:rgba(74,222,128,0.1);color:#4ade80;border:1px solid rgba(74,222,128,0.15);cursor:pointer;font-family:inherit;min-height:44px}
.mn-cat-cancel{padding:8px 16px;border-radius:8px;font-size:0.78rem;font-weight:600;background:rgba(239,68,68,0.1);color:#f87171;border:1px solid rgba(239,68,68,0.15);cursor:pointer;font-family:inherit;min-height:44px}
.mn-cat-list{display:flex;flex-direction:column;gap:6px}
.mn-cat-item{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;background:var(--bg-tertiary)}
.mn-cat-name{font-size:0.85rem;font-weight:600;color:var(--text-primary);flex:1}
.mn-cat-dept{font-size:0.72rem;color:var(--text-tertiary);background:rgba(255,255,255,0.04);padding:2px 8px;border-radius:4px}
.mn-cat-count{font-size:0.72rem;color:var(--text-tertiary)}
.mn-cat-edit{font-size:0.72rem;color:var(--gold-400);cursor:pointer;background:none;border:none;font-family:inherit;padding:4px 8px;min-height:32px}

/* Filters */
.mn-filters{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.mn-search{flex:1;min-width:200px}
.mn-input{padding:10px 14px;border-radius:10px;background:var(--bg-tertiary);border:1px solid var(--border-default);color:var(--text-primary);font-size:0.85rem;font-family:inherit;outline:none;min-height:44px}
.mn-input:focus{border-color:var(--gold-400);box-shadow:0 0 0 3px rgba(251,191,36,0.1)}
.mn-input::placeholder{color:var(--text-tertiary)}
.mn-input-narrow{width:80px}
.mn-select{padding:10px 14px;border-radius:10px;background:var(--bg-tertiary);border:1px solid var(--border-default);color:var(--text-primary);font-size:0.85rem;font-family:inherit;outline:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2371717a' d='M6 8L1 3h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px;min-height:44px}
.mn-select:focus{border-color:var(--gold-400)}
.mn-textarea{padding:10px 14px;border-radius:10px;background:var(--bg-tertiary);border:1px solid var(--border-default);color:var(--text-primary);font-size:0.85rem;font-family:inherit;outline:none;resize:vertical;width:100%;min-height:60px}
.mn-textarea:focus{border-color:var(--gold-400)}

/* Desktop table */
.mn-table-wrap{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:14px;overflow:hidden;overflow-x:auto;-webkit-overflow-scrolling:touch}
.mn-table{width:100%;border-collapse:collapse;font-size:0.85rem}
.mn-table th{padding:12px 16px;text-align:left;font-size:0.72rem;font-weight:600;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--border-subtle);white-space:nowrap}
.mn-table td{padding:12px 16px;border-bottom:1px solid var(--border-subtle);vertical-align:middle}
.mn-table tr:last-child td{border-bottom:none}
.mn-table tr:hover{background:var(--bg-card-hover)}
.mn-item-name{font-weight:600;color:var(--text-primary)}
.mn-item-desc{font-size:0.72rem;color:var(--text-tertiary);margin-top:2px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mn-item-price{font-weight:700;color:var(--gold-400)}

/* Badges */
.mn-badge{display:inline-block;padding:3px 8px;border-radius:6px;font-size:0.72rem;font-weight:600;white-space:nowrap}
.mn-badge-gold{background:rgba(251,191,36,0.12);color:#fbbf24}
.mn-badge-gray{background:rgba(107,114,128,0.12);color:#9ca3af}

/* Toggle */
.mn-toggle{width:38px;height:22px;border-radius:11px;background:var(--bg-tertiary);border:1px solid var(--border-default);cursor:pointer;position:relative;transition:all 0.2s;flex-shrink:0;min-width:44px;min-height:28px;padding:0;display:flex;align-items:center}
.mn-toggle-on{background:rgba(74,222,128,0.2);border-color:rgba(74,222,128,0.3)}
.mn-toggle-dot{display:block;width:16px;height:16px;border-radius:50%;background:#71717a;transition:all 0.2s;margin-left:3px}
.mn-toggle-on .mn-toggle-dot{background:#4ade80;margin-left:19px}
.mn-toggle-sm{width:32px;height:18px;min-width:36px;min-height:24px}
.mn-toggle-sm .mn-toggle-dot{width:12px;height:12px;margin-left:3px}
.mn-toggle-sm.mn-toggle-on .mn-toggle-dot{margin-left:15px}

/* Actions */
.mn-actions{display:flex;gap:6px}
.mn-act-edit{padding:5px 12px;border-radius:6px;font-size:0.72rem;font-weight:600;background:rgba(59,130,246,0.1);color:#3b82f6;border:1px solid rgba(59,130,246,0.15);cursor:pointer;font-family:inherit;min-height:32px}
.mn-act-del{padding:5px 12px;border-radius:6px;font-size:0.72rem;font-weight:600;background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.15);cursor:pointer;font-family:inherit;min-height:32px}
.mn-act-full{flex:1}

/* Mobile cards */
.mn-show-mobile{display:none}
.mn-cards{display:flex;flex-direction:column;gap:10px}
.mn-card{padding:14px;border-radius:12px;background:var(--bg-card);border:1px solid var(--border-subtle)}
.mn-card-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
.mn-card-info{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}
.mn-card-name{font-size:0.9rem;font-weight:700;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mn-card-cat{font-size:0.72rem;color:var(--gold-400)}
.mn-card-price{font-size:0.95rem;font-weight:800;color:var(--gold-400);flex-shrink:0}
.mn-card-meta{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}
.mn-card-toggles{display:flex;align-items:center;gap:6px;margin-left:auto}
.mn-card-toggle-label{font-size:0.68rem;color:var(--text-tertiary)}
.mn-card-actions{display:flex;gap:8px}

/* Empty */
.mn-empty{text-align:center;padding:32px;color:var(--text-tertiary);font-size:0.85rem}

/* Modal */
.mn-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px;animation:mn-fadein 0.2s}
@keyframes mn-fadein{from{opacity:0}to{opacity:1}}
.mn-modal{background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:20px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;animation:mn-slideup 0.3s cubic-bezier(0.16,1,0.3,1)}
@keyframes mn-slideup{from{opacity:0;transform:translateY(20px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
.mn-modal-header{padding:20px 20px 14px;border-bottom:1px solid var(--border-subtle);display:flex;justify-content:space-between;align-items:center}
.mn-modal-header h2{font-size:1.1rem;font-weight:700}
.mn-modal-close{width:36px;height:36px;border-radius:8px;background:rgba(255,255,255,0.04);border:none;color:var(--text-tertiary);font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;min-width:44px;min-height:44px}
.mn-modal-body{padding:20px;display:flex;flex-direction:column;gap:14px}
.mn-form-group{display:flex;flex-direction:column;gap:6px}
.mn-label{font-size:0.78rem;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.03em}
.mn-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.mn-checkbox{display:flex;align-items:center;gap:8px;font-size:0.85rem;color:var(--text-secondary);cursor:pointer;min-height:44px}
.mn-checkbox input{width:18px;height:18px;accent-color:var(--gold-400);cursor:pointer}
.mn-modal-footer{padding:14px 20px;border-top:1px solid var(--border-subtle);display:flex;justify-content:flex-end;gap:10px}
.mn-btn-cancel{padding:10px 20px;border-radius:10px;font-size:0.85rem;font-weight:600;background:var(--bg-tertiary);border:1px solid var(--border-default);color:var(--text-secondary);cursor:pointer;font-family:inherit;min-height:44px}
.mn-btn-save{padding:10px 24px;border-radius:10px;font-size:0.85rem;font-weight:700;background:var(--gold-400);color:var(--bg-primary);border:none;cursor:pointer;font-family:inherit;min-height:44px}
.mn-btn-save:disabled{opacity:0.5;cursor:wait}

/* Responsive */
@media(max-width:1024px){
  .mn-cats-list{overflow-x:auto;-webkit-overflow-scrolling:touch;flex-wrap:nowrap;padding-bottom:4px;scrollbar-width:none;-ms-overflow-style:none}
  .mn-cats-list::-webkit-scrollbar{display:none}
  .mn-cat-item{white-space:nowrap;flex-shrink:0}
  .mn-filters{flex-wrap:wrap}
  .mn-table{min-width:650px}
}
@media(max-width:640px){
  .mn-hide-mobile{display:none}
  .mn-show-mobile{display:flex}
  .mn-header{flex-direction:column;gap:10px}
  .mn-header-actions{width:100%;justify-content:stretch;gap:6px}
  .mn-header-actions button{flex:1}
  .mn-title{font-size:1.1rem}
  .mn-sub{font-size:0.75rem}
  .mn-form-row{grid-template-columns:1fr}
  .mn-filters{flex-direction:column;gap:8px}
  .mn-search{min-width:0;width:100%}
  .mn-modal-overlay{padding:0;align-items:flex-end}
  .mn-modal{border-radius:20px 20px 0 0;max-height:92vh;width:100%;max-width:100%}
  .mn-modal-header{padding:14px 16px}
  .mn-modal-header h2{font-size:1rem}
  .mn-modal-body{padding:14px 16px}
  .mn-modal-footer{padding:12px 16px}
  .mn-btn-cancel,.mn-btn-save{flex:1;min-height:44px}
  .mn-card{padding:12px}
  .mn-card-top{flex-direction:column;gap:6px}
  .mn-card-price{align-self:flex-start}
  .mn-card-meta{flex-wrap:wrap;gap:6px}
  .mn-card-actions{flex-direction:column}
  .mn-act-edit,.mn-act-del{width:100%;text-align:center;min-height:40px}
  .mn-cats-list{gap:4px}
  .mn-cat-item{padding:6px 10px;font-size:0.72rem}
  .mn-table{min-width:550px}
  .mn-fg input,.mn-fg select{min-height:44px;font-size:0.88rem}
}
`;
