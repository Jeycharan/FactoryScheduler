// server/test.js
const assert = require('assert');
const { runSchedule, verifyPlanConstraints } = require('./scheduler');

const sampleCtx = {
  lines: ['L1', 'L2', 'L3'],
  allowed: {
    P1: ['L1', 'L2'],
    P2: ['L1'],
    P3: ['L1', 'L2', 'L3'],
    P4: ['L2', 'L3'],
    P5: ['L2', 'L3'],
    P6: ['L1', 'L3'],
    P7: ['L1', 'L3'],
  },
  matrix: {
    P1: { P1: 0, P2: 0.5, P3: 2, P4: 2, P5: 2, P6: 2, P7: 0.5 },
    P2: { P1: 0.5, P2: 0, P3: 2, P4: 2, P5: 2, P6: 2, P7: 0.5 },
    P3: { P1: 1, P2: 1, P3: 0, P4: 0.5, P5: 0.5, P6: 0.5, P7: 1 },
    P4: { P1: 1, P2: 1, P3: 0.5, P4: 0, P5: 0.5, P6: 0.5, P7: 1 },
    P5: { P1: 1, P2: 1, P3: 0.5, P4: 0.5, P5: 0, P6: 0.5, P7: 1 },
    P6: { P1: 1, P2: 1, P3: 0.5, P4: 0.5, P5: 0.5, P6: 0, P7: 1 },
    P7: { P1: 0.5, P2: 0.5, P3: 2, P4: 2, P5: 2, P6: 2, P7: 0 },
  },
  orders: {
    O1:  { code: 'O1',  product: 'P1', runTime: 6,  due: 12 },
    O2:  { code: 'O2',  product: 'P1', runTime: 8,  due: 30 },
    O3:  { code: 'O3',  product: 'P2', runTime: 10, due: 20 },
    O4:  { code: 'O4',  product: 'P2', runTime: 8,  due: 40 },
    O5:  { code: 'O5',  product: 'P3', runTime: 6,  due: 16 },
    O6:  { code: 'O6',  product: 'P3', runTime: 5,  due: 36 },
    O7:  { code: 'O7',  product: 'P4', runTime: 7,  due: 14 },
    O8:  { code: 'O8',  product: 'P5', runTime: 6,  due: 24 },
    O9:  { code: 'O9',  product: 'P6', runTime: 8,  due: 28 },
    O10: { code: 'O10', product: 'P7', runTime: 5,  due: 18 },
    O11: { code: 'O11', product: 'P4', runTime: 6,  due: 44 },
    O12: { code: 'O12', product: 'P2', runTime: 12, due: 10 },
  },
  orderIds: ['O1', 'O2', 'O3', 'O4', 'O5', 'O6', 'O7', 'O8', 'O9', 'O10', 'O11', 'O12']
};

console.log('==================================================');
console.log('RUNNING SCHEDULER TEST ON SEED FACTORY DATA...');
console.log('==================================================\n');

const result = runSchedule(sampleCtx);

console.log('1. Baseline (First Allowed Line):');
console.log(`   Changeover: ${result.baseline.totalChangeover}h, Late: ${result.baseline.totalLate}h, Cost: ${result.baseline.cost}`);
console.log('   Plan:', JSON.stringify(result.baseline.plan));

console.log('\n2. Balanced Baseline (Least Current Load):');
console.log(`   Changeover: ${result.balancedBaseline.totalChangeover}h, Late: ${result.balancedBaseline.totalLate}h, Cost: ${result.balancedBaseline.cost}`);
console.log('   Plan:', JSON.stringify(result.balancedBaseline.plan));

console.log('\n3. Greedy Schedule:');
console.log(`   Changeover: ${result.greedy.totalChangeover}h, Late: ${result.greedy.totalLate}h, Cost: ${result.greedy.cost}`);
console.log('   Plan:', JSON.stringify(result.greedy.plan));

console.log('\n4. Optimized (Greedy + Local Search):');
console.log(`   Changeover: ${result.optimized.totalChangeover}h, Late: ${result.optimized.totalLate}h, Cost: ${result.optimized.cost}`);
console.log('   Plan:', JSON.stringify(result.optimized.plan));

console.log('\nLate Orders in Optimized Plan:');
for (const lo of result.lateOrders) {
  console.log(`   - Order ${lo.order} on ${lo.line}: End=${lo.end}h, Due=${lo.due}h, LateBy=${lo.lateBy}h, Impossible=${lo.impossible}`);
}

console.log('\n--- VERIFYING ACCEPTANCE CRITERIA ---');

// 1. Verify baseline values
assert.strictEqual(result.baseline.totalChangeover, 5.5, 'Baseline changeover must be 5.5h');
assert.strictEqual(result.baseline.totalLate, 169, 'Baseline late hours must be 169h');
assert.strictEqual(result.baseline.cost, 1695.5, 'Baseline cost must be 1695.5');
console.log('✔ Acceptance 1.1: Baseline matches section 4');

// 2. Verify greedy values
assert.strictEqual(result.greedy.totalChangeover, 7.5, 'Greedy changeover must be 7.5h');
assert.strictEqual(result.greedy.totalLate, 10, 'Greedy late hours must be 10h');
assert.strictEqual(result.greedy.cost, 107.5, 'Greedy cost must be 107.5');
console.log('✔ Acceptance 1.2: Greedy matches section 4');

// 3. Verify optimized values
assert.strictEqual(result.optimized.totalChangeover, 6.5, 'Optimized changeover must be 6.5h');
assert.strictEqual(result.optimized.totalLate, 7, 'Optimized late hours must be 7h');
assert.strictEqual(result.optimized.cost, 76.5, 'Optimized cost must be 76.5');
console.log('✔ Acceptance 1.3: Optimized matches section 4 (6.5h changeover, 7h late, 76.5 cost)');

// 4. Verify optimized sequence
assert.deepStrictEqual(result.optimized.plan.L1, ['O12', 'O3', 'O4'], 'L1 must be O12 -> O3 -> O4');
assert.deepStrictEqual(result.optimized.plan.L2, ['O1', 'O2', 'O8', 'O11'], 'L2 must be O1 -> O2 -> O8 -> O11');
assert.deepStrictEqual(result.optimized.plan.L3, ['O7', 'O5', 'O10', 'O9', 'O6'], 'L3 must be O7 -> O5 -> O10 -> O9 -> O6');
console.log('✔ Acceptance 1.4: Optimized plan sequences match section 4');

// 5. Automated line eligibility check
const constraintCheck = verifyPlanConstraints(result.optimized.plan, sampleCtx);
assert.strictEqual(constraintCheck.valid, true, 'No order should violate allowed lines');
console.log('✔ Acceptance 2: Machine eligibility verified - no orders on disallowed lines');

// 6. O12 impossible check
const o12Late = result.lateOrders.find(o => o.order === 'O12');
assert(o12Late !== undefined, 'O12 must be reported late');
assert(o12Late.lateBy >= 2, 'O12 must be at least 2h late');
assert.strictEqual(o12Late.impossible, true, 'O12 must be flagged as impossible');
console.log('✔ Acceptance 3: O12 detected as late by >=2h and flagged as impossible');

console.log('\nALL ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY!');
