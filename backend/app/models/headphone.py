"""
Headphone Model & Characteristics
Maps headphone specs to audio characteristics
"""

from dataclasses import dataclass
from typing import List, Dict, Optional
from enum import Enum


class HeadphoneType(Enum):
    OVER_EAR = "Over-ear"
    ON_EAR = "On-ear"
    IN_EAR = "In-ear"
    BONE_CONDUCTION = "Bone-conduction"


class UseCase(Enum):
    STUDIO = "Studio"
    GAMING = "Gaming"
    CASUAL = "Casual"
    WORKOUT = "Workout"


class SoundProfile(Enum):
    BALANCED = "Balanced"
    FLAT = "Flat"
    BASS_HEAVY = "Bass-heavy"


@dataclass
class HeadphoneCharacteristics:
    """
    Audio characteristics derived from headphone specs
    Normalized 0-1 for comparison with AudioProfile
    """
    # Frequency response (inferred from sound_profile + bass_level)
    bass_response: float
    mids_response: float
    treble_response: float

    # Soundstage & imaging (inferred from type + use_case)
    soundstage_width: float
    imaging_quality: float

    # Tonal characteristics
    warmth: float  # Warm vs analytical
    detail_retrieval: float  # Resolving power

    # Comfort & isolation
    isolation: float  # Passive + ANC
    comfort_score: float

    # Build quality indicators
    durability_score: float


@dataclass
class Headphone:
    """Full headphone model with specs and derived characteristics"""
    # From CSV
    headphone_id: int
    brand: str
    model: str
    price: float
    type: HeadphoneType
    use_case: UseCase
    bass_level: str  # 'Low', 'Medium', 'High'
    sound_profile: SoundProfile
    noise_cancellation: bool
    user_rating: float
    user_reviews: int

    # Derived characteristics
    characteristics: HeadphoneCharacteristics

    # Metadata
    full_name: str
    slug: str
    description: str

    @staticmethod
    def from_csv_row(row: Dict) -> 'Headphone':
        """Create Headphone from CSV data"""
        headphone_type = Headphone._parse_type(row['type'])
        use_case = Headphone._parse_use_case(row['use_case'])
        sound_profile = Headphone._parse_sound_profile(row['sound_profile'])
        bass_level = row['bass_level']

        # Derive characteristics
        characteristics = Headphone._derive_characteristics(
            headphone_type,
            use_case,
            sound_profile,
            bass_level,
            row['noise_cancellation'] == 'Yes',
            float(row['price'])
        )

        return Headphone(
            headphone_id=int(row['headphone_id']),
            brand=row['brand'],
            model=row['model'],
            price=float(row['price']),
            type=headphone_type,
            use_case=use_case,
            bass_level=bass_level,
            sound_profile=sound_profile,
            noise_cancellation=row['noise_cancellation'] == 'Yes',
            user_rating=float(row['user_rating']),
            user_reviews=int(row['user_reviews']),
            characteristics=characteristics,
            full_name=f"{row['brand']} {row['model']}",
            slug=f"{row['brand']}-{row['model']}".lower().replace(' ', '-'),
            description=Headphone._generate_description(row)
        )

    @staticmethod
    def _parse_type(type_str: str) -> HeadphoneType:
        type_map = {
            'over-ear': HeadphoneType.OVER_EAR,
            'on-ear': HeadphoneType.ON_EAR,
            'in-ear': HeadphoneType.IN_EAR,
            'bone-conduction': HeadphoneType.BONE_CONDUCTION
        }
        return type_map.get(type_str.lower(), HeadphoneType.OVER_EAR)

    @staticmethod
    def _parse_use_case(use_case_str: str) -> UseCase:
        use_case_map = {
            'studio': UseCase.STUDIO,
            'gaming': UseCase.GAMING,
            'casual': UseCase.CASUAL,
            'workout': UseCase.WORKOUT
        }
        return use_case_map.get(use_case_str.lower(), UseCase.CASUAL)

    @staticmethod
    def _parse_sound_profile(profile_str: str) -> SoundProfile:
        profile_map = {
            'balanced': SoundProfile.BALANCED,
            'flat': SoundProfile.FLAT,
            'bass-heavy': SoundProfile.BASS_HEAVY
        }
        return profile_map.get(profile_str.lower(), SoundProfile.BALANCED)

    @staticmethod
    def _derive_characteristics(
        hp_type: HeadphoneType,
        use_case: UseCase,
        sound_profile: SoundProfile,
        bass_level: str,
        has_anc: bool,
        price: float
    ) -> HeadphoneCharacteristics:
        """
        Derive audio characteristics from headphone specs

        This uses audio engineering knowledge to infer characteristics
        """
        # Base frequency response from sound profile
        if sound_profile == SoundProfile.FLAT:
            bass, mids, treble = 0.5, 0.5, 0.5
            warmth = 0.3  # Analytical
            detail = 0.9
        elif sound_profile == SoundProfile.BALANCED:
            bass, mids, treble = 0.6, 0.6, 0.6
            warmth = 0.5
            detail = 0.7
        else:  # BASS_HEAVY
            bass, mids, treble = 0.9, 0.4, 0.4
            warmth = 0.7
            detail = 0.5

        # Adjust bass by bass_level
        bass_multipliers = {'Low': 0.7, 'Medium': 1.0, 'High': 1.3}
        bass *= bass_multipliers.get(bass_level, 1.0)
        bass = min(bass, 1.0)

        # Soundstage & imaging by type
        if hp_type == HeadphoneType.OVER_EAR:
            soundstage = 0.8
            imaging = 0.8
            comfort = 0.8
        elif hp_type == HeadphoneType.ON_EAR:
            soundstage = 0.6
            imaging = 0.6
            comfort = 0.6
        elif hp_type == HeadphoneType.IN_EAR:
            soundstage = 0.4
            imaging = 0.5
            comfort = 0.7
        else:  # Bone conduction
            soundstage = 0.3
            imaging = 0.3
            comfort = 0.9

        # Studio headphones get imaging boost
        if use_case == UseCase.STUDIO:
            imaging += 0.2
            detail += 0.1
            soundstage += 0.1

        # Gaming headphones get soundstage boost
        if use_case == UseCase.GAMING:
            soundstage += 0.15
            bass += 0.1

        # ANC adds isolation
        isolation = 0.8 if has_anc else 0.5

        # Price correlates with build quality and detail
        price_factor = min(price / 1000, 1.0)  # Normalize to 0-1
        durability = 0.5 + (price_factor * 0.5)
        detail += price_factor * 0.1

        # Clip all values
        return HeadphoneCharacteristics(
            bass_response=min(bass, 1.0),
            mids_response=min(mids, 1.0),
            treble_response=min(treble, 1.0),
            soundstage_width=min(soundstage, 1.0),
            imaging_quality=min(imaging, 1.0),
            warmth=min(warmth, 1.0),
            detail_retrieval=min(detail, 1.0),
            isolation=isolation,
            comfort_score=min(comfort, 1.0),
            durability_score=durability
        )

    @staticmethod
    def _generate_description(row: Dict) -> str:
        """Generate marketing description"""
        use_case_desc = {
            'Studio': 'professional audio production and critical listening',
            'Gaming': 'immersive gaming experiences with spatial awareness',
            'Casual': 'everyday listening and commuting',
            'Workout': 'active lifestyles and fitness activities'
        }

        desc = f"The {row['brand']} {row['model']} delivers {row['sound_profile'].lower()} sound "
        desc += f"perfect for {use_case_desc.get(row['use_case'], 'audio enjoyment')}. "

        if row['noise_cancellation'] == 'Yes':
            desc += "Features active noise cancellation for immersive listening. "

        desc += f"Rated {row['user_rating']}/5 by {int(row['user_reviews']):,} users."

        return desc

    def to_dict(self) -> Dict:
        """Convert to dict for API responses"""
        return {
            'id': self.headphone_id,
            'brand': self.brand,
            'model': self.model,
            'full_name': self.full_name,
            'slug': self.slug,
            'price': self.price,
            'type': self.type.value,
            'use_case': self.use_case.value,
            'sound_profile': self.sound_profile.value,
            'bass_level': self.bass_level,
            'has_anc': self.noise_cancellation,
            'rating': self.user_rating,
            'reviews': self.user_reviews,
            'description': self.description,
            'characteristics': {
                'bass': self.characteristics.bass_response,
                'mids': self.characteristics.mids_response,
                'treble': self.characteristics.treble_response,
                'soundstage': self.characteristics.soundstage_width,
                'imaging': self.characteristics.imaging_quality,
                'warmth': self.characteristics.warmth,
                'detail': self.characteristics.detail_retrieval,
                'isolation': self.characteristics.isolation,
                'comfort': self.characteristics.comfort_score,
                'durability': self.characteristics.durability_score
            }
        }
