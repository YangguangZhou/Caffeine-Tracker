## 2024-XX-XX - Avoid spreading mapped arrays into Math.max/min
**Learning:** Using `Math.max(...arr.map(x => x.y))` can cause 'Maximum call stack size exceeded' on large arrays and creates unnecessary intermediate array allocations, reducing performance.
**Action:** Use a single `.reduce()` pass to calculate min/max values efficiently without intermediate array creation.
