// client/src/LateReport.jsx
import React, { useState } from 'react';
import { AlertOctagon, HelpCircle, AlertTriangle, CheckCircle, ListOrdered, Clock } from 'lucide-react';

export default function LateReport({ scheduleData, activePlanKey = 'optimized' }) {
  const [showFullPlan, setShowFullPlan] = useState(false);

  if (!scheduleData) return null;

  const { lateOrders = [], impossibleOrders = [] } = scheduleData;
  const activePlanData = scheduleData[activePlanKey] || scheduleData.optimized;
  const planRows = activePlanData?.rows || [];

  return (
    <section className="glass-card" id="late-orders-report-section">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 className="section-title">
            <AlertOctagon size={22} color="#f43f5e" />
            Lateness & Feasibility Audit Report
          </h2>
          <span className="section-badge" style={{ color: lateOrders.length > 0 ? '#fb7185' : '#34d399' }}>
            {lateOrders.length} Late Order{lateOrders.length !== 1 ? 's' : ''} in Optimized Plan
          </span>
        </div>

        <button
          id="btn-toggle-full-schedule-table"
          className="btn btn-secondary btn-sm"
          onClick={() => setShowFullPlan(!showFullPlan)}
        >
          <ListOrdered size={16} />
          {showFullPlan ? 'Hide Timed Sequence' : 'Show All Timed Rows'}
        </button>
      </div>

      {/* Late Orders Table */}
      {lateOrders.length === 0 ? (
        <div className="state-message" style={{ color: '#34d399' }}>
          <CheckCircle size={36} />
          <span>No late orders in this plan! All deliveries are on schedule.</span>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="custom-table" id="late-orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Product</th>
                <th>Line</th>
                <th>Run Time</th>
                <th>Finish Hour</th>
                <th>Customer Due</th>
                <th>Hours Late</th>
                <th>Category / Root Cause</th>
              </tr>
            </thead>
            <tbody>
              {lateOrders.map((item) => (
                <tr key={item.order} id={`late-row-${item.order}`}>
                  <td className="table-mono" style={{ fontWeight: 700, color: '#fff' }}>
                    {item.order}
                  </td>
                  <td>
                    <span className={`badge ${['P1', 'P2', 'P7'].includes(item.product) ? 'badge-latex' : 'badge-nonlatex'}`}>
                      {item.product}
                    </span>
                  </td>
                  <td className="table-mono">{item.line}</td>
                  <td className="table-mono">{item.runTime}h</td>
                  <td className="table-mono">{item.end}h</td>
                  <td className="table-mono">{item.due}h</td>
                  <td className="table-mono" style={{ color: '#f87171', fontWeight: 700 }}>
                    +{item.lateBy}h
                  </td>
                  <td>
                    {item.impossible ? (
                      <span className="badge badge-impossible">
                        Structurally Impossible (Due {item.due}h &lt; Run {item.runTime}h)
                      </span>
                    ) : (
                      <span className="badge badge-late">
                        Line Competition / Allergen Clean Delay
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Analytical Root Causes (Directly addressing Section 4) */}
      <div
        style={{
          marginTop: 20,
          padding: 16,
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <HelpCircle size={16} color="#6366f1" /> Root-Cause Analysis for Planner:
        </h4>
        <ul style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.8, paddingLeft: 20 }}>
          <li>
            <strong style={{ color: '#fb7185' }}>O12 (+2h Late):</strong> Structurally impossible. Order needs 12 hours run time on L1 (its only allowed line) but is due at hour 10. Even beginning at hour 0 with zero changeover, it cannot finish before hour 12.
          </li>
          <li>
            <strong style={{ color: '#fbbf24' }}>O3 (+2h Late):</strong> Product P2 is restricted exclusively to L1, where it directly competes with O12. Running O3 first would delay O12 by 12 hours (costing 120+); placing O12 first costs only 2h + 2h = 4h late penalty. The scheduler correctly prioritizes minimal global disruption.
          </li>
          <li>
            <strong style={{ color: '#38bdf8' }}>O10 (+1.5h Late) & O9 (+1.5h Late):</strong> Late due to strict allergen hygiene constraints on Line 3. Transitioning from non-latex P5 to latex P7 incurs 1h changeover, followed by a mandatory 2-hour allergen deep-clean when switching back from latex P7 to non-latex P6.
          </li>
        </ul>
      </div>

      {/* Optional: Complete Timed Rows for Full Visibility */}
      {showFullPlan && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12, color: '#fff' }}>
            Complete Timed Schedule Breakdown ({activePlanKey === 'optimized' ? 'Optimized' : activePlanKey})
          </h3>
          <div className="table-responsive">
            <table className="custom-table" id="all-timed-rows-table">
              <thead>
                <tr>
                  <th>Line</th>
                  <th>Order</th>
                  <th>Product</th>
                  <th>Changeover (h)</th>
                  <th>Start (h)</th>
                  <th>End (h)</th>
                  <th>Due (h)</th>
                  <th>Late By (h)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {planRows.map((r, idx) => (
                  <tr key={`${r.line}-${r.order}-${idx}`}>
                    <td className="table-mono" style={{ fontWeight: 600 }}>{r.line}</td>
                    <td className="table-mono" style={{ fontWeight: 700, color: '#fff' }}>{r.order}</td>
                    <td>
                      <span className={`badge ${['P1', 'P2', 'P7'].includes(r.product) ? 'badge-latex' : 'badge-nonlatex'}`}>
                        {r.product}
                      </span>
                    </td>
                    <td className="table-mono">
                      {r.changeover > 0 ? (
                        <span style={{ color: r.changeover === 2 ? '#f59e0b' : '#94a3b8' }}>
                          {r.changeover}h {r.changeover === 2 ? '(Allergen)' : ''}
                        </span>
                      ) : (
                        <span style={{ color: '#64748b' }}>0h (First)</span>
                      )}
                    </td>
                    <td className="table-mono">{r.start}h</td>
                    <td className="table-mono">{r.end}h</td>
                    <td className="table-mono">{r.due}h</td>
                    <td className="table-mono" style={{ color: r.lateBy > 0 ? '#f87171' : '#34d399', fontWeight: 700 }}>
                      {r.lateBy > 0 ? `+${r.lateBy}h` : '0h'}
                    </td>
                    <td>
                      {r.lateBy > 0 ? (
                        r.impossible ? (
                          <span className="badge badge-impossible">Impossible</span>
                        ) : (
                          <span className="badge badge-late">Late</span>
                        )
                      ) : (
                        <span className="badge badge-on-time">On Time</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
