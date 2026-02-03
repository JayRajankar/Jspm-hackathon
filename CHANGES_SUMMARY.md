# Live vs. Static Data Visualization — Changes Summary

## Overview
Refactored real-time data tracking to support two distinct modes:
- **Single Product**: Live simulation & real-time updates (1 product at a time)
- **Multiple Products**: Static historical comparison (all data loaded upfront, displayed as compiled graph)

---

## Key Changes

### 1. **useSensorSimulation.js** (Core Hook)
**Changes:**
- Replaced cycling-based multi-product playback with static history compilation
- `playbackIndex` changed from object `{pid: idx}` to single number (single-product only)
- Added `staticMultiHistory` state: pre-compiled array of all product data points
- New `useEffect` compiles all selected products' histories into one dataset for static display

**Behavior:**
- **Single Product**: Simulation loop cycles through historical data at 1s/point (live feel)
- **Multiple Products**: No simulation; all data loaded upfront and displayed as static graph
- Fleet data always loads complete dataset (all 10 products) when multi-select is active

**Return value:**
```javascript
displayHistory = selectedProducts.length > 1 ? staticMultiHistory : history
```

---

### 2. **TrendGraph.jsx** (Frontend Component)
**Changes:**
- Updated title: "Real-time Risk Trend" → "Historical Data Comparison" (for multi-product)
- Conditional rendering based on mode:
  - **Multi-product**: LineChart with static data (all products as separate lines)
  - **Single-product**: AreaChart with live streaming data (cyan gradient fill)

**Visual:**
- Multi-product graph shows complete historical dataset without animation
- Single-product shows live, animated area chart with real-time updates

---

### 3. **RiskTreeMap.jsx** (Fleet Overview)
**Changes:**
- Updated empty state message: "Select multiple products..." → "to view complete fleet risk overview"
- Title changed: "Fleet Risk Assessment" → "Complete Fleet Risk Assessment"
- Now displays total fleet overview (all 10 products) when multiple are selected

---

### 4. **main.py** (Backend) — No Changes Required
- `/fleet/status` endpoint already supports fetching multiple products
- Demo dataset fallback ensures smooth dev experience

---

## Workflow

### Single Product Selected
1. User selects 1 product from dropdown
2. Hook loads historical data for that product
3. Simulation loop starts (1s interval, cycles through data)
4. **TrendGraph**: Shows live area chart with real-time updates
5. **RiskAnalysis**: Single product risk via API (`/predict`)

### Multiple Products Selected
1. User selects 2+ products
2. Hook loads ALL historical data for selected products
3. Data is compiled into one big history array (static)
4. Simulation loop **does NOT run** (no cycling)
5. **TrendGraph**: Shows static line chart with all product histories
6. **RiskTreeMap**: Loads complete fleet (all 10 products)

---

## Testing Checklist

- [ ] Select single product → verify area chart animates and updates live
- [ ] Stop/start simulation → chart pauses/resumes
- [ ] Select multiple products → static line chart appears (no animation)
- [ ] Hover over multi-product chart → tooltip shows all product risks
- [ ] Select all products → treemap shows complete fleet risk categories
- [ ] Deselect products → charts clear appropriately
- [ ] Browser console → no errors, no React warnings

---

## Files Modified
1. `src/hooks/useSensorSimulation.js` — Core state & logic
2. `src/components/Dashboard/TrendGraph.jsx` — Conditional rendering
3. `src/components/Dashboard/RiskTreeMap.jsx` — UI & copy updates
4. `backend/main.py` — Demo dataset fallback (done earlier)

---

## Notes
- No backend API changes required
- Single-product mode maintains backward compatibility
- Multi-product graph is non-interactive (no tooltips on individual points, static display)
- Fleet treemap always shows complete dataset for multi-select (improved visibility)
