from __future__ import annotations

from plagiarism.domain.algorithms import jaccard, risk_level, shingles, tokenize


def test_tokenize_basic() -> None:
    tokens = tokenize("Hello World! This is a test.")
    assert tokens == ["hello", "world", "this", "is", "a", "test"]


def test_shingles_size() -> None:
    tokens = tokenize("the quick brown fox jumps over the lazy dog")
    s = shingles(tokens, 3)
    assert isinstance(s, set)
    assert len(s) > 0
    for shingle in s:
        assert len(shingle.split()) == 3


def test_jaccard_identical() -> None:
    tokens = tokenize("the quick brown fox")
    s = shingles(tokens, 2)
    assert jaccard(s, s) == 1.0


def test_jaccard_disjoint() -> None:
    a = shingles(tokenize("apple banana cherry"), 2)
    b = shingles(tokenize("dog elephant fox"), 2)
    assert jaccard(a, b) == 0.0


def test_jaccard_partial() -> None:
    a = shingles(tokenize("the quick brown fox"), 2)
    b = shingles(tokenize("the quick red fox"), 2)
    score = jaccard(a, b)
    assert 0.0 < score < 1.0


def test_risk_level_bands() -> None:
    assert risk_level(0.0) == "none"
    assert risk_level(0.1) == "low"
    assert risk_level(0.25) == "medium"
    assert risk_level(0.5) == "high"
    assert risk_level(0.75) == "critical"
