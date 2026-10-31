// client/src/OrdersTable.jsx
import React, { useState } from 'react';
import { Package, Plus, Trash2, Edit2, AlertCircle, RefreshCw, X, Check } from 'lucide-react';

export default function OrdersTable({
  orders,
  products,
  onAddOrder,
  onEditOrder,
  onDeleteOrder,
  onResetSeed,
  loading
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    product: 'P1',
    runTime: '',
    due: ''
  });
  const [errorMsg, setErrorMsg] = useState('');

  const productsMap = (products || []).reduce((acc, p) => {
    acc[p.code] = p;
    return acc;
  }, {});

  const openAddModal = () => {
    setEditingOrder(null);
    setFormData({
      code: `O${orders.length + 1}`,
      product: products[0]?.code || 'P1',
      runTime: '',
      due: ''
    });
    setErrorMsg('');
    setModalOpen(true);
  };

  const openEditModal = (order) => {
    setEditingOrder(order);
    setFormData({
      code: order.code,
      product: order.product,
      runTime: order.runTime,
      due: order.due
    });
    setErrorMsg('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingOrder(null);
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const runTime = Number(formData.runTime);
    const due = Number(formData.due);

    if (!formData.code.trim()) {
      setErrorMsg('Order code is required.');
      return;
    }
    if (isNaN(runTime) || runTime <= 0) {
      setErrorMsg('Run time must be a positive number greater than 0.');
      return;
    }
    if (isNaN(due) || due < 0) {
      setErrorMsg('Due date must be a non-negative number.');
      return;
    }

    try {
      if (editingOrder) {
        await onEditOrder(editingOrder.code, {
          product: formData.product,
          runTime,
          due
        });
      } else {
        await onAddOrder({
          code: formData.code.trim().toUpperCase(),
          product: formData.product,
          runTime,
          due
        });
      }
      closeModal();
    } catch (err) {
      setErrorMsg(err.message || 'Action failed.');
    }
  };

  return (
    <section className="glass-card" id="orders-table-section">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 className="section-title">
            <Package size={22} color="#f59e0b" />
            Production Orders & Demand Pipeline
          </h2>
          <span className="section-badge">{orders.length} Orders Loaded</span>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            id="btn-reset-seed-data"
            className="btn btn-secondary btn-sm"
            onClick={onResetSeed}
            disabled={loading}
            title="Reset database to seed dataset from Section 2"
          >
            <RefreshCw size={14} className={loading ? 'spinner' : ''} />
            Reset to Seed Data
          </button>
          <button
            id="btn-open-add-order-modal"
            className="btn btn-primary btn-sm"
            onClick={openAddModal}
          >
            <Plus size={16} />
            Add New Order
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="custom-table" id="orders-table">
          <thead>
            <tr>
              <th>Order Code</th>
              <th>Product</th>
              <th>Product Name</th>
              <th>Family</th>
              <th>Allowed Lines</th>
              <th>Run Time</th>
              <th>Due Hour</th>
              <th>Feasibility</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const prod = productsMap[o.product] || {};
              const isImpossible = Number(o.runTime) > Number(o.due);

              return (
                <tr key={o.code} id={`order-row-${o.code}`}>
                  <td className="table-mono" style={{ fontWeight: 700, color: '#fff' }}>
                    {o.code}
                  </td>
                  <td>
                    <span
                      className={`badge ${prod.family === 'latex' ? 'badge-latex' : 'badge-nonlatex'}`}
                    >
                      {o.product}
                    </span>
                  </td>
                  <td style={{ color: '#cbd5e1' }}>{prod.name || '—'}</td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: prod.family === 'latex' ? '#fbbf24' : '#38bdf8' }}>
                      {prod.family || '—'}
                    </span>
                  </td>
                  <td className="table-mono">
                    {(prod.allowedLines || []).join(', ') || 'None'}
                  </td>
                  <td className="table-mono">{o.runTime}h</td>
                  <td className="table-mono">{o.due}h</td>
                  <td>
                    {isImpossible ? (
                      <span
                        className="badge badge-impossible"
                        title="Intentionally impossible: Run time exceeds due date even starting at hour 0"
                      >
                        Impossible (Run &gt; Due)
                      </span>
                    ) : (
                      <span className="badge badge-on-time">Feasible</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button
                        id={`btn-edit-order-${o.code}`}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px' }}
                        onClick={() => openEditModal(o)}
                        title="Edit Order"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        id={`btn-delete-order-${o.code}`}
                        className="btn btn-danger-outline btn-sm"
                        style={{ padding: '4px 8px' }}
                        onClick={() => onDeleteOrder(o.code)}
                        title="Delete Order"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Order Modal */}
      {modalOpen && (
        <div className="modal-overlay" id="order-modal-overlay">
          <div className="modal-content" id="order-modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingOrder ? `Edit Order ${editingOrder.code}` : 'Add Production Order'}
              </h3>
              <button
                className="btn btn-secondary btn-sm"
                style={{ padding: 4 }}
                onClick={closeModal}
              >
                <X size={16} />
              </button>
            </div>

            {errorMsg && (
              <div
                style={{
                  padding: '8px 12px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid #ef4444',
                  borderRadius: 'var(--radius-sm)',
                  color: '#f87171',
                  fontSize: '0.82rem',
                  marginBottom: 14
                }}
              >
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Order Code</label>
                <input
                  id="input-order-code"
                  type="text"
                  className="form-input"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  disabled={Boolean(editingOrder)}
                  placeholder="e.g. O13"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Product</label>
                <select
                  id="select-order-product"
                  className="form-select"
                  value={formData.product}
                  onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                >
                  {products.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.code} — {p.name} ({p.family}, Lines: {p.allowedLines.join(', ')})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Run Time (Hours)</label>
                  <input
                    id="input-order-runtime"
                    type="number"
                    step="0.5"
                    min="0.5"
                    className="form-input"
                    value={formData.runTime}
                    onChange={(e) => setFormData({ ...formData, runTime: e.target.value })}
                    placeholder="e.g. 6"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Due Date (Hours)</label>
                  <input
                    id="input-order-due"
                    type="number"
                    step="1"
                    min="0"
                    className="form-input"
                    value={formData.due}
                    onChange={(e) => setFormData({ ...formData, due: e.target.value })}
                    placeholder="e.g. 24"
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  id="btn-save-order"
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingOrder ? 'Update Order' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
