// server/scheduler.js
// Pure JavaScript factory scheduler core - no DB or HTTP dependencies

const DEFAULT_LATE_WEIGHT = 10;

/**
 * Returns changeover time between two products.
 * First order on a line (from === null) has 0 changeover.
 */
function changeover(matrix, from, to) {
  if (!from) return 0;
  if (!matrix[from] || matrix[from][to] === undefined) return 0;
  return matrix[from][to];
}

/**
 * Simulates execution of a sequence of orders on a single line.
 */
function simulateLine(line, seq, ctx) {
  let t = 0;
  let prev = null;
  return seq.map((id) => {
    const o = ctx.orders[id];
    const co = changeover(ctx.matrix, prev, o.product);
    const start = t + co;
    const end = start + o.runTime;
    t = end;
    prev = o.product;
    const lateBy = Math.max(0, end - o.due);
    return {
      line,
      order: id,
      product: o.product,
      runTime: o.runTime,
      changeover: co,
      start,
      end,
      due: o.due,
      lateBy,
      impossible: o.runTime > o.due
    };
  });
}

/**
 * Evaluates the full plan across all lines, computing total changeover, late hours, and weighted cost.
 */
function evaluate(plan, ctx, lateWeight = ctx.lateWeight ?? DEFAULT_LATE_WEIGHT) {
  const rows = Object.entries(plan).flatMap(([line, seq]) => simulateLine(line, seq, ctx));
  const totalChangeover = rows.reduce((s, r) => s + r.changeover, 0);
  const totalLate = rows.reduce((s, r) => s + r.lateBy, 0);
  const cost = lateWeight * totalLate + totalChangeover;

  return {
    plan,
    rows,
    totalChangeover: Number(totalChangeover.toFixed(2)),
    totalLate: Number(totalLate.toFixed(2)),
    cost: Number(cost.toFixed(2))
  };
}

/**
 * Baseline 1 (Whiteboard):
 * Orders in arrival order, each placed on the first allowed line.
 */
function baseline(ctx) {
  const plan = Object.fromEntries(ctx.lines.map((l) => [l, []]));
  for (const id of ctx.orderIds) {
    const allowed = ctx.allowed[ctx.orders[id].product];
    if (allowed && allowed.length > 0) {
      plan[allowed[0]].push(id);
    }
  }
  return evaluate(plan, ctx);
}

/**
 * Baseline 2 (Balanced baseline):
 * Orders in arrival order, each placed on the allowed line with the least current load
 * (total runtime + changeovers up to that point), no sequencing optimization.
 */
function balancedBaseline(ctx) {
  const plan = Object.fromEntries(ctx.lines.map((l) => [l, []]));
  
  for (const id of ctx.orderIds) {
    const product = ctx.orders[id].product;
    const allowedLines = ctx.allowed[product] || [];
    if (allowedLines.length === 0) continue;

    let bestLine = allowedLines[0];
    let minEnd = Infinity;

    for (const line of allowedLines) {
      // Simulate appending to this line to find its completion time
      plan[line].push(id);
      const rows = simulateLine(line, plan[line], ctx);
      const last = rows[rows.length - 1];
      plan[line].pop();

      if (last.end < minEnd) {
        minEnd = last.end;
        bestLine = line;
      }
    }

    plan[bestLine].push(id);
  }

  return evaluate(plan, ctx);
}

/**
 * Greedy schedule:
 * Sort orders by due date (earliest first).
 * For each order, try every allowed line and place on the line where it finishes earliest (tie -> smaller changeover).
 */
function greedy(ctx) {
  const plan = Object.fromEntries(ctx.lines.map((l) => [l, []]));
  const sorted = [...ctx.orderIds].sort((a, b) => ctx.orders[a].due - ctx.orders[b].due);

  for (const id of sorted) {
    let best = null;
    const allowedLines = ctx.allowed[ctx.orders[id].product] || [];
    for (const line of allowedLines) {
      plan[line].push(id);
      const rows = simulateLine(line, plan[line], ctx);
      const last = rows[rows.length - 1];
      plan[line].pop();

      if (
        !best ||
        last.end < best.end ||
        (last.end === best.end && last.changeover < best.co)
      ) {
        best = { line, end: last.end, co: last.changeover };
      }
    }
    if (best) {
      plan[best.line].push(id);
    }
  }
  return plan;
}

/**
 * Local search (improvement):
 * Repeatedly try removing one order and inserting it at every position on every allowed line.
 * Keep the move if cost decreases. Stop when no single move improves the cost.
 */
function improve(plan, ctx) {
  let cur = evaluate(plan, ctx).cost;
  let improved = true;

  while (improved) {
    improved = false;
    outer:
    for (const from of ctx.lines) {
      for (let i = 0; i < plan[from].length; i++) {
        const id = plan[from][i];
        const allowed = ctx.allowed[ctx.orders[id].product] || [];
        for (const to of allowed) {
          for (let j = 0; j <= plan[to].length; j++) {
            // If same position on same line, skip
            if (from === to && (j === i || j === i + 1)) continue;

            const trial = structuredClone(plan);
            trial[from].splice(i, 1);
            trial[to].splice(j, 0, id);
            const c = evaluate(trial, ctx).cost;
            if (c < cur) {
              plan = trial;
              cur = c;
              improved = true;
              break outer;
            }
          }
        }
      }
    }
  }
  return plan;
}

/**
 * Validates the context before running the scheduler.
 */
function validateContext(ctx) {
  const errors = [];
  const impossibleOrders = [];

  for (const id of ctx.orderIds) {
    const o = ctx.orders[id];
    if (!o) {
      errors.push(`Order ${id} is listed in orderIds but not found in orders`);
      continue;
    }
    const allowed = ctx.allowed[o.product];
    if (!allowed || allowed.length === 0) {
      errors.push(`Product ${o.product} for order ${id} has no allowed lines`);
    }
    if (o.runTime > o.due) {
      impossibleOrders.push({
        order: id,
        product: o.product,
        runTime: o.runTime,
        due: o.due,
        minLateBy: o.runTime - o.due,
        reason: `Run time (${o.runTime}h) exceeds due date (${o.due}h) even starting at hour 0`
      });
    }
  }

  return { valid: errors.length === 0, errors, impossibleOrders };
}

/**
 * Verifies that no order in a plan is placed on a disallowed line.
 */
function verifyPlanConstraints(plan, ctx) {
  const violations = [];
  for (const [line, seq] of Object.entries(plan)) {
    for (const id of seq) {
      const allowed = ctx.allowed[ctx.orders[id].product] || [];
      if (!allowed.includes(line)) {
        violations.push({ order: id, line, allowedLines: allowed });
      }
    }
  }
  return { valid: violations.length === 0, violations };
}

/**
 * Main entry point: runs baseline, balanced baseline, greedy, and optimized schedules.
 */
function runSchedule(ctx) {
  const validation = validateContext(ctx);
  if (!validation.valid) {
    throw new Error(`Schedule validation failed: ${validation.errors.join('; ')}`);
  }

  const baseResult = baseline(ctx);
  const balancedResult = balancedBaseline(ctx);
  const greedyPlan = greedy(ctx);
  const greedyResult = evaluate(greedyPlan, ctx);
  const optimizedPlan = improve(greedyPlan, ctx);
  const optimizedResult = evaluate(optimizedPlan, ctx);

  // Constraint check
  const constraintCheck = verifyPlanConstraints(optimizedResult.plan, ctx);
  if (!constraintCheck.valid) {
    throw new Error(`Plan violates machine eligibility: ${JSON.stringify(constraintCheck.violations)}`);
  }

  const lateOrders = optimizedResult.rows
    .filter((r) => r.lateBy > 0)
    .map((r) => ({
      order: r.order,
      line: r.line,
      product: r.product,
      runTime: r.runTime,
      changeover: r.changeover,
      start: r.start,
      end: r.end,
      due: r.due,
      lateBy: r.lateBy,
      impossible: ctx.orders[r.order].runTime > ctx.orders[r.order].due,
      reason: ctx.orders[r.order].runTime > ctx.orders[r.order].due
        ? `Impossible: Run time (${ctx.orders[r.order].runTime}h) exceeds due date (${ctx.orders[r.order].due}h)`
        : `Line competition and sequence changeovers caused finish at ${r.end}h (due ${r.due}h)`
    }));

  return {
    baseline: baseResult,
    balancedBaseline: balancedResult,
    greedy: greedyResult,
    optimized: optimizedResult,
    lateOrders,
    impossibleOrders: validation.impossibleOrders,
    validation
  };
}

module.exports = {
  runSchedule,
  evaluate,
  simulateLine,
  baseline,
  balancedBaseline,
  greedy,
  improve,
  validateContext,
  verifyPlanConstraints,
  DEFAULT_LATE_WEIGHT
};
