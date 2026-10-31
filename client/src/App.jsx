// client/src/App.jsx
import React, { useState, useEffect } from 'react';
import { Layers, Play, Sliders, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import SummaryCards from './SummaryCards';
import GanttChart from './GanttChart';
import LateReport from './LateReport';
import OrdersTable from './OrdersTable';

export default function App() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [scheduleData, setScheduleData] = useState(null);
  const [lateWeight, setLateWeight] = useState(10);
  const [activePlanKey, setActivePlanKey] = useState('optimized');
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Initial data load
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [prodsRes, ordersRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/orders')
      ]);

      if (!prodsRes.ok || !ordersRes.ok) {
        throw new Error('Failed to load initial data from server.');
      }

      const prodsData = await prodsRes.json();
      const ordersData = await ordersRes.json();

      setProducts(prodsData);
      setOrders(ordersData);

      // Run schedule right away
      await triggerScheduler(10);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Error connecting to factory backend.');
    } finally {
      setLoading(false);
    }
  };

  const triggerScheduler = async (weight = lateWeight) => {
    setCalculating(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/schedule/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lateWeight: Number(weight) }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || errorData.details || 'Scheduling calculation failed.');
      }

      const result = await res.json();
      setScheduleData(result);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Error running scheduler.');
    } finally {
      setCalculating(false);
    }
  };

  const handleAddOrder = async (orderPayload) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add order');
    }

    const created = await res.json();
    setOrders((prev) => [...prev, created]);
    await triggerScheduler(lateWeight);
  };

  const handleEditOrder = async (code, updatePayload) => {
    const res = await fetch(`/api/orders/${code}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update order');
    }

    const updated = await res.json();
    setOrders((prev) => prev.map((o) => (o.code === code ? updated : o)));
    await triggerScheduler(lateWeight);
  };

  const handleDeleteOrder = async (code) => {
    if (!window.confirm(`Are you sure you want to delete order ${code}?`)) {
      return;
    }

    const res = await fetch(`/api/orders/${code}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Failed to delete order');
      return;
    }

    setOrders((prev) => prev.filter((o) => o.code !== code));
    await triggerScheduler(lateWeight);
  };

  const handleResetSeed = async () => {
    if (!window.confirm('Reset all factory orders back to the Section 2 benchmark seed data?')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (!res.ok) throw new Error('Reset failed');
      await fetchInitialData();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to reset seed data');
      setLoading(false);
    }
  };

  const handleWeightSliderChange = (e) => {
    const newWeight = Number(e.target.value);
    setLateWeight(newWeight);
    triggerScheduler(newWeight);
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="app-header">
        <div className="brand-wrapper">
          <div className="brand-icon">
            <Layers size={28} />
          </div>
          <div>
            <h1 className="brand-title">Factory Production Scheduler</h1>
            <p className="brand-subtitle">
              Parallel Machine Scheduling • Allergen Matrix Optimization • Due Date Adherence
            </p>
          </div>
        </div>

        <div className="header-actions">
          {/* Late Weight Configurator */}
          <div className="slider-control" title="Tradeoff weight for late hours vs changeover hours in cost function">
            <span className="slider-label">
              <Sliders size={14} /> Late Weight:
            </span>
            <input
              id="slider-late-weight"
              type="range"
              min="1"
              max="25"
              step="1"
              value={lateWeight}
              onChange={handleWeightSliderChange}
              className="custom-range"
            />
            <span className="slider-val-badge" id="badge-late-weight-val">
              {lateWeight}×
            </span>
          </div>

          {/* Run Scheduler Button */}
          <button
            id="btn-run-scheduler"
            className="btn btn-primary"
            onClick={() => triggerScheduler(lateWeight)}
            disabled={calculating || loading}
          >
            {calculating ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Optimizing...
              </>
            ) : (
              <>
                <Play size={16} fill="currentColor" />
                Run Scheduler
              </>
            )}
          </button>
        </div>
      </header>

      {/* Global Error Banner */}
      {errorMessage && (
        <div
          style={{
            padding: '14px 18px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            borderRadius: 'var(--radius-md)',
            color: '#f87171',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={20} />
            <span>{errorMessage}</span>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setErrorMessage('')}
          >
            Dismiss
          </button>
        </div>
      )}

      {loading && !scheduleData ? (
        <div className="glass-card state-message">
          <div className="spinner" />
          <p>Connecting to Factory Scheduler Backend & Computing Optimization...</p>
        </div>
      ) : (
        <>
          {/* 1. Summary Cards (Baseline vs Balanced vs Optimized) */}
          <SummaryCards scheduleData={scheduleData} />

          {/* 2. Interactive Gantt Chart */}
          <GanttChart
            scheduleData={scheduleData}
            activePlanKey={activePlanKey}
            onPlanChange={setActivePlanKey}
          />

          {/* 3. Lateness & Feasibility Audit Report */}
          <LateReport
            scheduleData={scheduleData}
            activePlanKey={activePlanKey}
          />

          {/* 4. Production Orders Demand Pipeline (CRUD) */}
          <OrdersTable
            orders={orders}
            products={products}
            onAddOrder={handleAddOrder}
            onEditOrder={handleEditOrder}
            onDeleteOrder={handleDeleteOrder}
            onResetSeed={handleResetSeed}
            loading={calculating}
          />
        </>
      )}
    </div>
  );
}
