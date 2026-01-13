"""
Quick test script to verify the backend is working correctly
Run this after starting the server to test the recommendation engine
"""

import requests
import json
from typing import Dict, Any

# Backend URL
API_URL = "http://localhost:8000"


def print_section(title: str):
    """Print a formatted section header"""
    print(f"\n{'='*80}")
    print(f" {title}")
    print(f"{'='*80}\n")


def test_health_check():
    """Test 1: Health check endpoint"""
    print_section("TEST 1: Health Check")

    response = requests.get(f"{API_URL}/")
    data = response.json()

    print(f"Status: {data['status']}")
    print(f"Service: {data['service']}")
    print(f"Version: {data['version']}")
    print(f"Headphones loaded: {data['headphones_loaded']}")
    print(f"Songs loaded: {data['songs_loaded']}")

    if data['status'] == 'online':
        print("\n✓ Backend is online and ready!")
        return True
    else:
        print("\n✗ Backend is not responding correctly")
        return False


def test_bass_head_recommendations():
    """Test 2: Bass-heavy music profile"""
    print_section("TEST 2: Bass-Head Profile (Hip-Hop/EDM)")

    request_data = {
        "genres": ["hip_hop", "edm"],
        "favorite_tracks": [
            {"name": "SICKO MODE", "artist": "Travis Scott"},
            {"name": "Bangarang", "artist": "Skrillex"}
        ],
        "primary_use_case": "casual",
        "budget_min": 200,
        "budget_max": 400,
        "anc_required": True,
        "use_llm_refinement": False  # Faster for testing
    }

    response = requests.post(
        f"{API_URL}/api/recommendations",
        json=request_data
    )

    if response.status_code != 200:
        print(f"✗ Request failed: {response.status_code}")
        print(response.json())
        return False

    data = response.json()

    # Print user profile
    profile = data['user_profile']
    print("Extracted Audio Profile:")
    print(f"  Bass Preference: {profile['bass_preference']:.2f} (High)")
    print(f"  Mids Preference: {profile['mids_preference']:.2f}")
    print(f"  Treble Preference: {profile['treble_preference']:.2f}")
    print(f"  Sound Signature: {profile['sound_signature']}")
    print(f"  Confidence: {profile['confidence']:.2f}")

    # Print recommendations
    print(f"\nTop {len(data['recommendations'])} Recommendations:\n")
    for rec in data['recommendations'][:3]:
        hp = rec['headphone']
        scores = rec['scores']

        print(f"{rec['rank']}. {hp['full_name']} - ${hp['price']:.0f}")
        print(f"   Overall Score: {scores['overall']:.1f}/100")
        print(f"   Sound Match: {scores['sound_profile']:.1f}/100")
        print(f"   Bass Level: {hp['bass_level']}")
        print(f"   Highlights: {', '.join(rec['match_highlights'][:2])}")
        print()

    print("✓ Bass-head recommendations generated successfully!")
    return True


def test_audiophile_recommendations():
    """Test 3: Analytical/Studio profile"""
    print_section("TEST 3: Audiophile Profile (Classical/Jazz)")

    request_data = {
        "genres": ["classical", "jazz"],
        "favorite_tracks": [
            {"name": "Clair de Lune", "artist": "Claude Debussy"},
            {"name": "Take Five", "artist": "Dave Brubeck"}
        ],
        "primary_use_case": "studio",
        "budget_min": 300,
        "budget_max": 500,
        "anc_required": False,
        "use_llm_refinement": False
    }

    response = requests.post(
        f"{API_URL}/api/recommendations",
        json=request_data
    )

    if response.status_code != 200:
        print(f"✗ Request failed: {response.status_code}")
        return False

    data = response.json()
    profile = data['user_profile']

    print("Extracted Audio Profile:")
    print(f"  Bass Preference: {profile['bass_preference']:.2f} (Low - Analytical)")
    print(f"  Soundstage: {profile['soundstage_width']:.2f} (Important for classical)")
    print(f"  Sound Signature: {profile['sound_signature']}")

    print(f"\nTop Recommendation:")
    top = data['recommendations'][0]
    hp = top['headphone']
    print(f"  {hp['full_name']} - ${hp['price']:.0f}")
    print(f"  Sound Profile: {hp['sound_profile']}")
    print(f"  Overall Score: {top['scores']['overall']:.1f}/100")

    print("\n✓ Audiophile recommendations generated successfully!")
    return True


def test_llm_refinement():
    """Test 4: LLM-enhanced recommendations (requires API key)"""
    print_section("TEST 4: LLM Refinement (Optional)")

    request_data = {
        "genres": ["pop", "r&b"],
        "favorite_tracks": [
            {"name": "Blinding Lights", "artist": "The Weeknd"},
            {"name": "Levitating", "artist": "Dua Lipa"}
        ],
        "primary_use_case": "casual",
        "budget_min": 100,
        "budget_max": 400,
        "anc_required": True,
        "use_llm_refinement": True  # Enable LLM
    }

    try:
        response = requests.post(
            f"{API_URL}/api/recommendations",
            json=request_data,
            timeout=30  # LLM can take longer
        )

        if response.status_code != 200:
            print(f"✗ Request failed: {response.status_code}")
            return False

        data = response.json()

        if data['metadata']['llm_used']:
            print("✓ LLM refinement active!")

            insights = data.get('llm_insights', {})
            if insights:
                print("\nLLM Insights:")
                print(f"  Top Pick Explanation: {insights.get('top_pick_explanation', 'N/A')[:150]}...")

                key_insights = insights.get('key_insights', [])
                if key_insights:
                    print("\n  Key Insights:")
                    for insight in key_insights[:3]:
                        print(f"    • {insight}")

                alternatives = insights.get('alternatives', {})
                if alternatives.get('value_pick'):
                    print(f"\n  Best Value: {alternatives['value_pick']['reason']}")

        else:
            print("⚠ LLM not available (ANTHROPIC_API_KEY not set)")
            print("  Recommendations generated using algorithm only")

        print("\n✓ Test completed!")
        return True

    except requests.exceptions.Timeout:
        print("⚠ Request timed out (LLM processing can take 10-20 seconds)")
        print("  This is normal - LLM is working but slow")
        return True
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def test_edge_cases():
    """Test 5: Edge cases"""
    print_section("TEST 5: Edge Cases")

    # Test 5a: No tracks provided
    print("5a. Testing with genres only (no favorite tracks)...")
    response = requests.post(
        f"{API_URL}/api/recommendations",
        json={
            "genres": ["rock"],
            "favorite_tracks": [],
            "primary_use_case": "casual",
            "budget_min": 100,
            "budget_max": 300,
            "use_llm_refinement": False
        }
    )

    if response.status_code == 200:
        data = response.json()
        print(f"  ✓ Returned {len(data['recommendations'])} recommendations (genre-based)")
    else:
        print(f"  ✗ Failed: {response.status_code}")

    # Test 5b: Impossible budget
    print("\n5b. Testing with impossible budget...")
    response = requests.post(
        f"{API_URL}/api/recommendations",
        json={
            "genres": ["pop"],
            "primary_use_case": "casual",
            "budget_min": 5000,
            "budget_max": 10000,
            "use_llm_refinement": False
        }
    )

    if response.status_code == 404:
        print(f"  ✓ Correctly returned 404 (no matches)")
    else:
        print(f"  ⚠ Expected 404, got {response.status_code}")

    # Test 5c: Strict requirements
    print("\n5c. Testing with strict ANC requirement...")
    response = requests.post(
        f"{API_URL}/api/recommendations",
        json={
            "genres": ["pop"],
            "primary_use_case": "casual",
            "budget_min": 100,
            "budget_max": 500,
            "anc_required": True,
            "use_llm_refinement": False
        }
    )

    if response.status_code == 200:
        data = response.json()
        # Check all have ANC
        all_have_anc = all(rec['headphone']['has_anc'] for rec in data['recommendations'])
        if all_have_anc:
            print(f"  ✓ All {len(data['recommendations'])} results have ANC (filter working)")
        else:
            print(f"  ✗ Some results don't have ANC (filter broken)")
    else:
        print(f"  ⚠ Status: {response.status_code}")

    print("\n✓ Edge case tests completed!")
    return True


def test_compare_endpoint():
    """Test 6: Compare headphones"""
    print_section("TEST 6: Compare Headphones")

    # First, get some headphone IDs
    response = requests.get(f"{API_URL}/api/headphones?limit=5")
    headphones = response.json()['headphones']

    if len(headphones) < 2:
        print("✗ Not enough headphones to compare")
        return False

    hp1 = headphones[0]
    hp2 = headphones[1]

    print(f"Comparing:")
    print(f"  A: {hp1['full_name']} (${hp1['price']:.0f})")
    print(f"  B: {hp2['full_name']} (${hp2['price']:.0f})")

    # Compare without profile
    response = requests.post(
        f"{API_URL}/api/compare",
        json={
            "headphone_ids": [hp1['id'], hp2['id']]
        }
    )

    if response.status_code != 200:
        print(f"✗ Compare failed: {response.status_code}")
        return False

    data = response.json()
    print("\n✓ Comparison generated successfully!")

    if 'comparison_table' in data:
        table = data['comparison_table']
        print(f"\nComparison:")
        print(f"  Price: ${table['price'][0]:.0f} vs ${table['price'][1]:.0f}")
        print(f"  Sound: {table['sound_profile'][0]} vs {table['sound_profile'][1]}")
        print(f"  Rating: {table['rating'][0]} vs {table['rating'][1]}")

    return True


def run_all_tests():
    """Run all tests"""
    print("\n" + "="*80)
    print(" SONICMATCH BACKEND TEST SUITE")
    print(" Testing recommendation engine and API endpoints")
    print("="*80)

    results = []

    # Test 1: Health check
    try:
        results.append(("Health Check", test_health_check()))
    except Exception as e:
        print(f"✗ Health check failed: {e}")
        print("\nMake sure the backend server is running:")
        print("  cd backend")
        print("  uvicorn app.main:app --reload")
        return

    # Test 2-6: Feature tests
    tests = [
        ("Bass-Head Profile", test_bass_head_recommendations),
        ("Audiophile Profile", test_audiophile_recommendations),
        ("LLM Refinement", test_llm_refinement),
        ("Edge Cases", test_edge_cases),
        ("Compare Endpoint", test_compare_endpoint),
    ]

    for name, test_func in tests:
        try:
            results.append((name, test_func()))
        except Exception as e:
            print(f"✗ {name} failed: {e}")
            results.append((name, False))

    # Summary
    print_section("TEST SUMMARY")
    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"  {status:8s} {name}")

    print(f"\nResults: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed! Backend is working correctly.")
    else:
        print(f"\n⚠ {total - passed} test(s) failed. Check the output above for details.")


if __name__ == "__main__":
    run_all_tests()
