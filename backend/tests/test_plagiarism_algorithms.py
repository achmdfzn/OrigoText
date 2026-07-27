from __future__ import annotations

from plagiarism.domain.algorithms import (
    SHINGLE_SIZE,
    jaccard,
    risk_level,
    sentences_with_offsets,
    shingles,
    tokenize,
)
from plagiarism.domain.models import RiskLevel


def test_tokenize_lowercases_and_drops_punctuation() -> None:
    assert tokenize("Hello World! This is a test.") == [
        "hello",
        "world",
        "this",
        "is",
        "a",
        "test",
    ]


def test_shingles_have_requested_width() -> None:
    tokens = tokenize("the quick brown fox jumps over the lazy dog")
    produced = shingles(tokens, 3)

    assert produced
    assert all(len(shingle.split()) == 3 for shingle in produced)


def test_shingles_are_stable_across_calls() -> None:
    tokens = tokenize("reproducible fingerprints matter for cross-process comparison")
    assert shingles(tokens, SHINGLE_SIZE) == shingles(tokens, SHINGLE_SIZE)


def test_shingles_of_short_text_are_empty() -> None:
    assert shingles(tokenize("only three words"), SHINGLE_SIZE) == set()


def test_jaccard_identical_and_disjoint() -> None:
    identical = shingles(tokenize("the quick brown fox"), 2)
    assert jaccard(identical, identical) == 1.0

    left = shingles(tokenize("apple banana cherry"), 2)
    right = shingles(tokenize("dog elephant fox"), 2)
    assert jaccard(left, right) == 0.0


def test_jaccard_partial_overlap_is_between_bounds() -> None:
    left = shingles(tokenize("the quick brown fox"), 2)
    right = shingles(tokenize("the quick red fox"), 2)
    assert 0.0 < jaccard(left, right) < 1.0


def test_jaccard_of_empty_sets_is_zero() -> None:
    assert jaccard(set(), set()) == 0.0


def test_risk_level_bands_match_thresholds() -> None:
    assert risk_level(0.0) == RiskLevel.NONE
    assert risk_level(0.09) == RiskLevel.NONE
    assert risk_level(0.1) == RiskLevel.LOW
    assert risk_level(0.25) == RiskLevel.MEDIUM
    assert risk_level(0.5) == RiskLevel.HIGH
    assert risk_level(0.75) == RiskLevel.CRITICAL
    assert risk_level(1.0) == RiskLevel.CRITICAL


def test_sentence_offsets_index_into_original_text() -> None:
    text = (
        "This first sentence is long enough to be kept by the extractor. "
        "Short one. "
        "Another sufficiently long sentence follows right here in the text."
    )
    spans = sentences_with_offsets(text)

    assert len(spans) == 2
    for start, end, sentence in spans:
        assert text[start:end].strip() == sentence
