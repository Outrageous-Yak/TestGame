"""Unit tests for musical engines (no audio hardware required)."""

from chord_engine import ChordEngine
from config import ScaleName
from scale_engine import ScaleEngine
from wind_detector import WindDetector
from signal_processing import SignalFeatures


def test_scale_engine_notes_in_scale() -> None:
    se = ScaleEngine("C", ScaleName.MINOR)
    notes = se.midi_notes
    assert len(notes) > 10
    step = se.step_note(notes[5], 1)
    assert step in notes


def test_chord_engine_returns_chord() -> None:
    se = ScaleEngine("C", ScaleName.MINOR)
    ce = ChordEngine(se)
    chord = ce.update(0.3)
    assert chord.name
    assert len(chord.tones) >= 3


def test_wind_detector_low_energy() -> None:
    wd = WindDetector(0.6)
    feats = SignalFeatures()
    state = wd.analyse(feats, False)
    assert 0.0 <= state.energy <= 1.0


if __name__ == "__main__":
    test_scale_engine_notes_in_scale()
    test_chord_engine_returns_chord()
    test_wind_detector_low_energy()
    print("All tests passed")
