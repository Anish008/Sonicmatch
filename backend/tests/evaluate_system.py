"""
Evaluation script for recommendation system
Run this to test the system with sample personas and verify quality
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.models.audio_profile import SpotifyFeatureExtractor
from app.services.recommendation_engine import RecommendationEngine
from tests.fixtures import (
    SAMPLE_TRACKS,
    SAMPLE_HEADPHONES,
    EXPECTED_RECOMMENDATIONS
)


def evaluate_persona(persona_name: str, verbose: bool = True):
    """
    Evaluate recommendation quality for a persona

    Args:
        persona_name: One of "bass_head", "audiophile", "pop_casual"
        verbose: Print detailed results

    Returns:
        Dict with evaluation metrics
    """
    persona_data = EXPECTED_RECOMMENDATIONS[persona_name]

    if verbose:
        print(f"\n{'='*80}")
        print(f"EVALUATING: {persona_name.upper()}")
        print(f"Description: {persona_data['description']}")
        print(f"{'='*80}\n")

    # Step 1: Extract audio profile
    tracks = persona_data["tracks"]
    profile = SpotifyFeatureExtractor.extract_from_tracks(tracks)

    if verbose:
        print("Extracted Audio Profile:")
        print(f"  Bass: {profile.bass_preference:.2f}")
        print(f"  Mids: {profile.mids_preference:.2f}")
        print(f"  Treble: {profile.treble_preference:.2f}")
        print(f"  Soundstage: {profile.soundstage_width:.2f}")
        print(f"  Warmth: {profile.warmth:.2f}")
        print(f"  Sound Signature: {profile.get_sound_signature().value}")
        print(f"  Confidence: {profile.confidence:.2f}")
        print()

    # Step 2: Get recommendations
    engine = RecommendationEngine()
    prefs = persona_data["preferences"]

    recommendations = engine.recommend(
        user_profile=profile,
        headphones=SAMPLE_HEADPHONES,
        budget_min=prefs["budget_min"],
        budget_max=prefs["budget_max"],
        primary_use_case=prefs["primary_use_case"],
        required_features={"anc": prefs.get("anc_required", False)},
        top_k=5
    )

    if verbose:
        print(f"Top {len(recommendations)} Recommendations:\n")
        for rec in recommendations:
            hp = rec.headphone
            print(f"{rec.rank}. {hp.full_name} - ${hp.price:.0f}")
            print(f"   Overall Score: {rec.scores.overall:.1f}/100")
            print(f"   Sound Match: {rec.scores.sound_profile:.1f}/100")
            print(f"   Use Case: {rec.scores.use_case:.1f}/100")
            print(f"   Highlights:")
            for highlight in rec.match_highlights:
                print(f"     • {highlight}")
            if rec.trade_offs:
                print(f"   Trade-offs:")
                for trade_off in rec.trade_offs:
                    print(f"     ⚠ {trade_off}")
            print()

    # Step 3: Evaluate quality
    expected_top = persona_data.get("expected_top_pick")
    actual_top = recommendations[0].headphone.model if recommendations else None

    profile_match = _check_profile_match(
        profile,
        persona_data.get("expected_profile", {})
    )

    results = {
        "persona": persona_name,
        "profile_extracted": {
            "bass": profile.bass_preference,
            "mids": profile.mids_preference,
            "treble": profile.treble_preference,
            "signature": profile.get_sound_signature().value
        },
        "profile_match_score": profile_match,
        "recommendations_count": len(recommendations),
        "top_pick": actual_top,
        "expected_top_pick": expected_top,
        "top_pick_correct": actual_top == expected_top if expected_top else None,
        "top_3_models": [r.headphone.model for r in recommendations[:3]],
        "avg_score": sum(r.scores.overall for r in recommendations) / len(recommendations) if recommendations else 0
    }

    if verbose:
        print("Evaluation Results:")
        print(f"  Profile Match Score: {profile_match:.1%}")
        print(f"  Expected Top Pick: {expected_top}")
        print(f"  Actual Top Pick: {actual_top}")
        print(f"  Match: {'✓' if results['top_pick_correct'] else '✗'}")
        print()

    return results


def _check_profile_match(actual: 'AudioProfile', expected: dict) -> float:
    """
    Check how well extracted profile matches expected profile

    Returns:
        Score 0-1 indicating match quality
    """
    if not expected:
        return 1.0

    score = 0.0
    count = 0

    # Check bass preference
    if "bass_preference" in expected:
        diff = abs(actual.bass_preference - expected["bass_preference"])
        score += max(0, 1 - diff)
        count += 1

    # Check mids
    if "mids_preference" in expected:
        diff = abs(actual.mids_preference - expected["mids_preference"])
        score += max(0, 1 - diff)
        count += 1

    # Check treble
    if "treble_preference" in expected:
        diff = abs(actual.treble_preference - expected["treble_preference"])
        score += max(0, 1 - diff)
        count += 1

    # Check sound signature
    if "sound_signature" in expected:
        actual_sig = actual.get_sound_signature().value
        if expected["sound_signature"].lower() in actual_sig.lower():
            score += 1
        count += 1

    return score / count if count > 0 else 0.0


def run_full_evaluation(verbose: bool = True):
    """
    Run evaluation on all personas

    Returns:
        Dict with overall metrics
    """
    personas = ["bass_head", "audiophile", "pop_casual"]
    results = []

    for persona in personas:
        result = evaluate_persona(persona, verbose=verbose)
        results.append(result)

    # Calculate overall metrics
    profile_match_avg = sum(r["profile_match_score"] for r in results) / len(results)
    top_pick_accuracy = sum(1 for r in results if r["top_pick_correct"]) / len(results)
    avg_recommendations = sum(r["recommendations_count"] for r in results) / len(results)

    if verbose:
        print("\n" + "="*80)
        print("OVERALL EVALUATION SUMMARY")
        print("="*80)
        print(f"Profile Extraction Accuracy: {profile_match_avg:.1%}")
        print(f"Top Pick Accuracy: {top_pick_accuracy:.1%}")
        print(f"Avg Recommendations per Query: {avg_recommendations:.1f}")
        print()

        # Per-persona summary
        print("Per-Persona Results:")
        for r in results:
            status = "✓" if r["top_pick_correct"] else "✗"
            print(f"  {status} {r['persona']:12s}: Profile {r['profile_match_score']:.0%}, "
                  f"Top: {r['top_pick']}")

    return {
        "results": results,
        "profile_match_avg": profile_match_avg,
        "top_pick_accuracy": top_pick_accuracy,
        "avg_recommendations": avg_recommendations
    }


def test_edge_cases(verbose: bool = True):
    """Test system behavior on edge cases"""
    from tests.fixtures import EDGE_CASES

    if verbose:
        print("\n" + "="*80)
        print("TESTING EDGE CASES")
        print("="*80 + "\n")

    engine = RecommendationEngine()

    for case_name, case_data in EDGE_CASES.items():
        if verbose:
            print(f"Testing: {case_name}")
            print(f"  {case_data['description']}")

        tracks = case_data.get("tracks", [])
        prefs = case_data["preferences"]

        # Extract profile
        if tracks:
            profile = SpotifyFeatureExtractor.extract_from_tracks(tracks)
        else:
            profile = SpotifyFeatureExtractor._default_profile()
            profile.genre_weights = {g: 1.0/len(prefs["genres"]) for g in prefs["genres"]}

        # Apply manual preferences if present
        if "manual_sliders" in case_data:
            profile = SpotifyFeatureExtractor.enhance_with_manual_preferences(
                profile,
                case_data["manual_sliders"],
                blend_weight=0.7
            )

        # Get recommendations
        try:
            recs = engine.recommend(
                user_profile=profile,
                headphones=SAMPLE_HEADPHONES,
                budget_min=prefs["budget_min"],
                budget_max=prefs["budget_max"],
                primary_use_case=prefs["primary_use_case"],
                required_features={
                    "anc": prefs.get("anc_required", False),
                    "wireless": prefs.get("wireless_required", False)
                },
                top_k=5
            )

            if verbose:
                print(f"  ✓ Returned {len(recs)} recommendations")
                if recs:
                    print(f"    Top pick: {recs[0].headphone.full_name}")

        except Exception as e:
            if verbose:
                print(f"  ✗ Error: {e}")

        if verbose:
            print()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Evaluate Sonicmatch recommendation system")
    parser.add_argument("--persona", choices=["bass_head", "audiophile", "pop_casual", "all"],
                       default="all", help="Which persona to evaluate")
    parser.add_argument("--quiet", action="store_true", help="Suppress verbose output")
    parser.add_argument("--edge-cases", action="store_true", help="Test edge cases")

    args = parser.parse_args()

    verbose = not args.quiet

    if args.edge_cases:
        test_edge_cases(verbose=verbose)
    elif args.persona == "all":
        results = run_full_evaluation(verbose=verbose)

        # Exit with error if quality is too low
        if results["profile_match_avg"] < 0.7:
            print("\n⚠ WARNING: Profile extraction accuracy below 70%")
            sys.exit(1)
        if results["top_pick_accuracy"] < 0.6:
            print("\n⚠ WARNING: Top pick accuracy below 60%")
            sys.exit(1)

        print("\n✓ All quality checks passed!")
        sys.exit(0)
    else:
        evaluate_persona(args.persona, verbose=verbose)
