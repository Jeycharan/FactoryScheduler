// client/src/SummaryCards.jsx
import React from 'react';
import { Clock, AlertTriangle, Zap, CheckCircle2, Info, TrendingDown, Layers } from 'lucide-react';

export default function SummaryCards({ scheduleData }) {
  if (!scheduleData) return null;

  const { baseline, balancedBaseline, optimized, lateWeight } = scheduleData;

  const costSavingVsBaseline = baseline?.cost && optimized?.cost
    ? (((baseline.cost - optimized.cost) / baseline.cost) * 100).toFixed(1)
    : 0;

  const lateHoursSavedVsBaseline = baseline?.totalLate && optimized?.totalLate
    ? (baseline.totalLate - optimized.totalLate).toFixed(1)
    : 0;

  const costSavingVsBalanced = balancedBaseline?.cost && optimized?.cost
    ? (((balancedBaseline.cost - optimized.cost) / balancedBaseline.cost) * 100).toFixed(1)
    : 0;

  return (
    <section className="glass-card" id="summary-cards-section">
      <div className="section-header">
        <h2 className="section-title">
          <Zap size={22} color="#6366f1" />
          Schedule Performance & Optimization Benchmark
        </h2>
        <span className="section-badge">
          Cost Formula: ({lateWeight} × Late Hours) + Changeover Hours
        </span>
      </div>

      <div className="summary-grid">
        {/* 1. Whiteboard Baseline */}
        <div className="metric-card" id="card-baseline">
          <div className="card-top">
            <span className="card-title">1. Baseline (Whiteboard)</span>
            <span className="card-badge badge-baseline">First Allowed Line</span>
          </div>

          <div className="metric-cost-row">
            <span className="metric-cost-label">Total Schedule Cost</span>
            <div className="metric-cost-value">{baseline?.cost?.toFixed(1) ?? '—'}</div>
          </div>

          <div className="metric-breakdown">
            <div>
              <span className="sub-metric-label">
                <Clock size={14} /> Changeover
              </span>
              <div className="sub-metric-value val-changeover">
                {baseline?.totalChangeover ?? 0}h
              </div>
            </div>
            <div>
              <span className="sub-metric-label">
                <AlertTriangle size={14} /> Total Late
              </span>
              <div className="sub-metric-value val-late">
                {baseline?.totalLate ?? 0}h
              </div>
            </div>
          </div>
        </div>

        {/* 2. Balanced Baseline */}
        <div className="metric-card" id="card-balanced-baseline">
          <div className="card-top">
            <span className="card-title">2. Balanced Baseline</span>
            <span className="card-badge badge-balanced">Least Current Load</span>
          </div>

          <div className="metric-cost-row">
            <span className="metric-cost-label">Total Schedule Cost</span>
            <div className="metric-cost-value">{balancedBaseline?.cost?.toFixed(1) ?? '—'}</div>
          </div>

          <div className="metric-breakdown">
            <div>
              <span className="sub-metric-label">
                <Clock size={14} /> Changeover
              </span>
              <div className="sub-metric-value val-changeover">
                {balancedBaseline?.totalChangeover ?? 0}h
              </div>
            </div>
            <div>
              <span className="sub-metric-label">
                <AlertTriangle size={14} /> Total Late
              </span>
              <div className="sub-metric-value val-late">
                {balancedBaseline?.totalLate ?? 0}h
              </div>
            </div>
          </div>
        </div>

        {/* 3. Optimized Schedule */}
        <div className="metric-card winner" id="card-optimized">
          <div className="card-top">
            <span className="card-title">3. Optimized Plan</span>
            <span className="card-badge badge-optimized">Greedy + Local Search</span>
          </div>

          <div className="metric-cost-row">
            <span className="metric-cost-label">Total Schedule Cost</span>
            <div className="metric-cost-value" style={{ color: '#818cf8' }}>
              {optimized?.cost?.toFixed(1) ?? '—'}
            </div>
          </div>

          <div className="metric-breakdown">
            <div>
              <span className="sub-metric-label">
                <Clock size={14} /> Changeover
              </span>
              <div className="sub-metric-value" style={{ color: '#fbbf24' }}>
                {optimized?.totalChangeover ?? 0}h
              </div>
            </div>
            <div>
              <span className="sub-metric-label">
                <AlertTriangle size={14} /> Total Late
              </span>
              <div className="sub-metric-value val-good">
                {optimized?.totalLate ?? 0}h
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Honest Caveat Banner */}
      <div className="caveat-banner" id="honest-caveat-banner">
        <Info size={20} style={{ flexShrink: 0, marginTop: 2, color: '#818cf8' }} />
        <div>
          <strong>Production Planner Notice & Honest Trade-off Analysis:</strong>
          <br />
          The naive whiteboard baseline shows less changeover time ({baseline?.totalChangeover}h) than the optimized plan ({optimized?.totalChangeover}h) solely because it carelessly dumps 9 orders onto L1 and leaves L3 completely idle. That saves changeover by not running lines, but causes an unacceptable <strong>{baseline?.totalLate} hours of late delivery</strong>!
          <br />
          When compared against the <strong>Balanced Baseline</strong> ({balancedBaseline?.totalLate}h late, cost {balancedBaseline?.cost}), the <strong>Optimized Plan</strong> slashes cost by <strong>{costSavingVsBalanced}%</strong> and cuts lateness down to just <strong>{optimized?.totalLate}h</strong> (of which at least 2h is structurally impossible due to O12's 12h run time vs 10h deadline).
        </div>
      </div>
    </section>
  );
}
