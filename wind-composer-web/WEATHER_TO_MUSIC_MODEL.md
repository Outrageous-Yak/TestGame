# Weather to Music Model

Weather does **not** map 1:1 to synth parameters.

```mermaid
flowchart TD
  WS[Weather Snapshot] --> WM[Weather Memory / Trends]
  WM --> E[Energy estimate]
  WM --> T[Tension bias]
  WM --> BPM[Target BPM contribution]
  E --> PB[Producer Brain]
  T --> PB
  BPM --> PB
  PB --> PI[Producer Intent]
  PI --> ACT[Producer Actions]
  ACT --> ARR[Arrangement]
  ACT --> MIX[Mix limits]
```

## Influences

| Weather signal | Musical interpretation |
|----------------|------------------------|
| Rising wind | Higher energy target, more hat density, fill probability |
| Falling pressure | Rising tension, longer builds |
| Gust | One-shot fill/flourish (quantized), temporary BPM boost decay |
| High humidity | More sustained harmony, less sharp percussion |
| Storm likelihood | Build/drop bias, tension cap with release |

## User control: Weather Influence

- **Subtle** — slow mood drift
- **Balanced** — noticeable but genre-dominant (default)
- **Strong** — stronger energy/tension/BPM targets; groove still protected

## Between updates

Music continues evolving via producer evaluation every 8 bars. Composition never waits for API refresh.
