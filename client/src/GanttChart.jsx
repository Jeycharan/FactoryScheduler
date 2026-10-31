// client/src/GanttChart.jsx
import React, { useState } from 'react';
import { BarChart3, AlertCircle, Info, Clock, CheckCircle } from 'lucide-react';

const LINE_NAMES = {
  L1: 'Moulding',
  L2: 'Assembly',
  L3: 'Packing'
};

export default function GanttChart({ scheduleData, activePlanKey = 'optimized', onPlanChange }) {
  const [hoveredItem, setHoveredItem] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (!scheduleData) return null;

  const activePlanData = scheduleData[activePlanKey] || scheduleData.optimized;
  const rows = activePlanData?.rows || [];
  const lines = ['L1', 'L2', 'L3'];

  // Find max end time to dynamically calculate axis scale
  const maxTime = Math.max(50, ...rows.map((r) => r.end));
  const timeLimit = Math.ceil((maxTime + 4) / 5) * 5; // round up to nearest multiple of 5

  // Scale: pixels per hour (e.g. 20px per hour)
  const scale = 20;
  const chartWidth = timeLimit * scale;

  // Generate hour markers
  const axisTicks = [];
  for (let h = 0; h <= timeLimit; h += 5) {
    axisTicks.push(h);
  }

  const handleMouseEnter = (item, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredItem(item);
    setTooltipPos({
      x: Math.min(window.innerWidth - 260, Math.max(10, rect.left + rect.width / 2 - 110)),
      y: rect.top - 10
    });
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  return (
    <section className="glass-card" id="gantt-chart-section">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 className="section-title">
            <BarChart3 size={22} color="#06b6d4" />
            Parallel Production Lines Gantt Chart
          </h2>
          <span className="section-badge">Timeline in hours from week start</span>
        </div>

        {/* View Switcher Tabs */}
        <div className="tabs-nav" style={{ margin: 0, padding: 0, border: 'none' }}>
          <button
            id="tab-view-optimized"
            className={`tab-btn ${activePlanKey === 'optimized' ? 'active' : ''}`}
            onClick={() => onPlanChange('optimized')}
          >
            Optimized Plan
          </button>
          <button
            id="tab-view-balanced"
            className={`tab-btn ${activePlanKey === 'balancedBaseline' ? 'active' : ''}`}
            onClick={() => onPlanChange('balancedBaseline')}
          >
            Balanced Baseline
          </button>
          <button
            id="tab-view-baseline"
            className={`tab-btn ${activePlanKey === 'baseline' ? 'active' : ''}`}
            onClick={() => onPlanChange('baseline')}
          >
            Whiteboard Baseline
          </button>
        </div>
      </div>

      <div className="gantt-wrapper">
        <div className="gantt-inner" style={{ width: chartWidth + 140 }}>
          {/* Time Axis */}
          <div className="gantt-axis" style={{ width: chartWidth }}>
            {axisTicks.map((hour) => (
              <div
                key={hour}
                className="gantt-axis-tick"
                style={{ left: `${hour * scale}px` }}
              >
                <span>{hour}h</span>
              </div>
            ))}
          </div>

          {/* Lines */}
          {lines.map((lineId) => {
            const lineRows = rows.filter((r) => r.line === lineId);

            return (
              <div key={lineId} className="gantt-line-row" id={`gantt-line-${lineId}`}>
                <div className="gantt-line-header">
                  <span className="gantt-line-code">{lineId}</span>
                  <span className="gantt-line-desc">{LINE_NAMES[lineId] || 'Line'}</span>
                </div>

                <div className="gantt-track" style={{ width: chartWidth }}>
                  {/* Grid background lines */}
                  {axisTicks.map((hour) => (
                    <div
                      key={`grid-${hour}`}
                      className={`gantt-grid-line ${hour % 10 === 0 ? 'major' : ''}`}
                      style={{ left: `${hour * scale}px` }}
                    />
                  ))}

                  {/* Render Orders and Changeovers */}
                  {lineRows.map((item) => {
                    const productMeta = scheduleData.productDetails?.[item.product] || {};
                    const isLate = item.lateBy > 0;
                    const isImpossible = item.impossible;
                    const family = productMeta.family || (['P1', 'P2', 'P7'].includes(item.product) ? 'latex' : 'nonlatex');

                    // Changeover block before this order (if changeover > 0)
                    const changeoverBlock = item.changeover > 0 ? (
                      <div
                        key={`co-${item.order}`}
                        className="gantt-block block-changeover"
                        style={{
                          left: `${(item.start - item.changeover) * scale}px`,
                          width: `${Math.max(16, item.changeover * scale)}px`,
                        }}
                        onMouseEnter={(e) =>
                          handleMouseEnter(
                            {
                              type: 'changeover',
                              line: item.line,
                              duration: item.changeover,
                              start: item.start - item.changeover,
                              end: item.start,
                              nextOrder: item.order,
                              nextProduct: item.product,
                              isAllergen: item.changeover === 2
                            },
                            e
                          )
                        }
                        onMouseLeave={handleMouseLeave}
                        title={`Changeover: ${item.changeover}h before ${item.order}`}
                      >
                        {item.changeover >= 1 ? `CO ${item.changeover}h` : `${item.changeover}h`}
                      </div>
                    ) : null;

                    // Order block
                    const orderBlock = (
                      <div
                        key={`ord-${item.order}`}
                        id={`gantt-block-${item.order}`}
                        className={`gantt-block block-order ${family} ${isLate ? 'is-late' : ''} ${isImpossible ? 'is-impossible' : ''}`}
                        style={{
                          left: `${item.start * scale}px`,
                          width: `${item.runTime * scale}px`,
                        }}
                        onMouseEnter={(e) =>
                          handleMouseEnter(
                            {
                              type: 'order',
                              ...item,
                              family,
                              productName: productMeta.name || item.product
                            },
                            e
                          )
                        }
                        onMouseLeave={handleMouseLeave}
                      >
                        <span className="block-code">
                          {item.order} {isLate ? '⚠️' : ''}
                        </span>
                        <span className="block-prod">
                          {item.product} ({item.runTime}h)
                        </span>
                      </div>
                    );

                    return (
                      <React.Fragment key={`group-${item.order}`}>
                        {changeoverBlock}
                        {orderBlock}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="gantt-legend" id="gantt-legend">
        <span style={{ fontWeight: 600, color: '#cbd5e1' }}>Visual Legend:</span>
        <div className="legend-item">
          <div className="legend-swatch swatch-latex" />
          <span>Latex Product (P1, P2, P7)</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch swatch-nonlatex" />
          <span>Non-Latex Product (P3, P4, P5, P6)</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch swatch-changeover" />
          <span>Changeover / Clean Setup (2h = Allergen Clean)</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch swatch-late" />
          <span>Late Delivery (Red Block)</span>
        </div>
        <div className="legend-item">
          <div
            className="legend-swatch swatch-late"
            style={{ borderStyle: 'dashed', borderColor: '#f43f5e' }}
          />
          <span>Structurally Impossible (Due &lt; Run Time)</span>
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredItem && (
        <div
          className="gantt-tooltip"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: 'translateY(-100%)'
          }}
        >
          {hoveredItem.type === 'changeover' ? (
            <>
              <div className="tt-title" style={{ color: '#fbbf24' }}>
                <span>Changeover & Cleaning</span>
                <span>{hoveredItem.duration}h</span>
              </div>
              <div className="tt-row">
                <span>Line:</span>
                <span>{hoveredItem.line}</span>
              </div>
              <div className="tt-row">
                <span>Window:</span>
                <span>{hoveredItem.start}h → {hoveredItem.end}h</span>
              </div>
              <div className="tt-row">
                <span>Type:</span>
                <span>{hoveredItem.isAllergen ? 'Allergen Deep Clean (2h)' : 'Product Setup (0.5h - 1h)'}</span>
              </div>
              <div className="tt-row">
                <span>Precedes Order:</span>
                <span>{hoveredItem.nextOrder} ({hoveredItem.nextProduct})</span>
              </div>
            </>
          ) : (
            <>
              <div className="tt-title">
                <span>Order {hoveredItem.order}</span>
                <span style={{ fontSize: '0.8rem', color: hoveredItem.family === 'latex' ? '#fbbf24' : '#38bdf8' }}>
                  {hoveredItem.family}
                </span>
              </div>
              <div className="tt-row">
                <span>Product:</span>
                <span>{hoveredItem.product} - {hoveredItem.productName}</span>
              </div>
              <div className="tt-row">
                <span>Line:</span>
                <span>{hoveredItem.line} ({LINE_NAMES[hoveredItem.line]})</span>
              </div>
              <div className="tt-row">
                <span>Run Time:</span>
                <span>{hoveredItem.runTime} hours</span>
              </div>
              <div className="tt-row">
                <span>Execution:</span>
                <span>{hoveredItem.start}h → {hoveredItem.end}h</span>
              </div>
              <div className="tt-row">
                <span>Customer Due:</span>
                <span>{hoveredItem.due}h</span>
              </div>
              {hoveredItem.changeover > 0 && (
                <div className="tt-row">
                  <span>Prior Changeover:</span>
                  <span>{hoveredItem.changeover}h</span>
                </div>
              )}
              <div className="tt-row">
                <span>Delivery Status:</span>
                <span style={{ color: hoveredItem.lateBy > 0 ? '#f87171' : '#34d399' }}>
                  {hoveredItem.lateBy > 0
                    ? `LATE by ${hoveredItem.lateBy}h ${hoveredItem.impossible ? '(Impossible)' : ''}`
                    : 'On Time'}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
