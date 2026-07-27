from __future__ import annotations

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from plagiarism.domain.algorithms import jaccard, shingles, tokenize, risk_level


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


if __name__ == "__main__":
    tests = [
        test_tokenize_basic,
        test_shingles_size,
        test_jaccard_identical,
        test_jaccard_disjoint,
        test_jaccard_partial,
        test_risk_level_bands,
    ]
    passed = 0
    for test in tests:
        try:
            test()
            print(f"  PASS  {test.__name__}")
            passed += 1
        except AssertionError as exc:
            print(f"  FAIL  {test.__name__}: {exc}")
        except Exception as exc:
            print(f"  ERROR {test.__name__}: {exc}")
    print(f"\n{passed}/{len(tests)} passed")
    sys.exit(0 if passed == len(tests) else 1)
