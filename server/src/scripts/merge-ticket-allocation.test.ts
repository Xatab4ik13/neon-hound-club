import assert from "node:assert/strict";
import { allocateMergeTickets } from "./merge-ticket-allocation.js";

// Yamaha: 1 билет = 1 участие, купленные билеты нельзя потратить повторно.
assert.deepEqual(allocateMergeTickets(100, 1), { entries: 100, debit: -100, balance: 0 });
assert.deepEqual(allocateMergeTickets(8060, 1), { entries: 8060, debit: -8060, balance: 0 });
assert.deepEqual(allocateMergeTickets(5, 2), { entries: 2, debit: -4, balance: 1 });
assert.throws(() => allocateMergeTickets(100, 0));
console.log("merge ticket allocation ok");