import logging
import os
import time
from threading import Lock
from typing import Any

import requests

logger = logging.getLogger(__name__)

_CACHE_TTL_SECONDS = 900
_CACHE_MAX_ITEMS = 256
_PLACE_CACHE: dict[str, tuple[float, dict[str, Any] | None]] = {}
_SEARCH_CACHE: dict[str, tuple[float, list[dict[str, Any]]]] = {}
_CACHE_LOCK = Lock()


class GooglePlacesError(Exception):
    pass


def search_google_places(
    query: str,
    max_results: int = 6,
    latitude: float | None = None,
    longitude: float | None = None,
) -> list[dict[str, Any]]:
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        raise GooglePlacesError("GOOGLE_MAPS_API_KEY chưa được cấu hình.")

    cache_key = f"{query.casefold()}|{max_results}|{latitude}|{longitude}"
    now = time.monotonic()
    with _CACHE_LOCK:
        cached = _SEARCH_CACHE.get(cache_key)
        if cached and cached[0] > now:
            return cached[1]

    payload: dict[str, Any] = {
        "textQuery": query,
        "languageCode": "vi",
        "regionCode": "VN",
        "maxResultCount": max_results,
        "includedType": "restaurant",
        "strictTypeFiltering": True,
    }
    if latitude is not None and longitude is not None:
        payload["locationBias"] = {
            "circle": {
                "center": {"latitude": latitude, "longitude": longitude},
                "radius": 10000,
            }
        }

    try:
        response = requests.post(
            "https://places.googleapis.com/v1/places:searchText",
            headers={
                "X-Goog-Api-Key": api_key,
                "X-Goog-FieldMask": (
                    "places.id,places.displayName,places.formattedAddress,"
                    "places.location,places.googleMapsUri,places.rating,"
                    "places.userRatingCount"
                ),
            },
            json=payload,
            timeout=8,
        )
        response.raise_for_status()
        places = response.json().get("places", [])
        if not isinstance(places, list):
            raise ValueError("Google Places trả về danh sách địa điểm không hợp lệ.")
    except (requests.RequestException, ValueError, AttributeError) as error:
        logger.warning("Google Places search failed for %r: %s", query, error)
        raise GooglePlacesError("Không thể tải dữ liệu địa điểm từ Google Places.") from error

    with _CACHE_LOCK:
        if len(_SEARCH_CACHE) >= _CACHE_MAX_ITEMS:
            _SEARCH_CACHE.pop(next(iter(_SEARCH_CACHE)))
        _SEARCH_CACHE[cache_key] = (time.monotonic() + _CACHE_TTL_SECONDS, places)
    return places


def find_google_place(name: str, address: str) -> dict[str, Any] | None:
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        return None

    query = f"{name}, {address}, Đà Nẵng, Việt Nam"
    cache_key = query.casefold()
    now = time.monotonic()
    with _CACHE_LOCK:
        cached = _PLACE_CACHE.get(cache_key)
        if cached and cached[0] > now:
            return cached[1]

    try:
        response = requests.post(
            "https://places.googleapis.com/v1/places:searchText",
            headers={
                "X-Goog-Api-Key": api_key,
                "X-Goog-FieldMask": (
                    "places.id,places.displayName,places.formattedAddress,"
                    "places.location,places.nationalPhoneNumber,places.websiteUri,"
                    "places.googleMapsUri,places.rating,places.userRatingCount,"
                    "places.regularOpeningHours.weekdayDescriptions"
                ),
            },
            json={
                "textQuery": query,
                "languageCode": "vi",
                "regionCode": "VN",
                "maxResultCount": 1,
            },
            timeout=4,
        )
        response.raise_for_status()
        places = response.json().get("places", [])
        place: dict[str, Any] | None = places[0] if places else None
    except (requests.RequestException, ValueError, AttributeError) as error:
        logger.warning("Google Places lookup failed for %r: %s", query, error)
        place = None

    if place:
        location = place.get("location") or {}
        display_name = place.get("displayName") or {}
        opening_hours = place.get("regularOpeningHours") or {}
        result = {
            "place_id": place.get("id"),
            "name": display_name.get("text"),
            "address": place.get("formattedAddress"),
            "phone": place.get("nationalPhoneNumber"),
            "website_url": place.get("websiteUri"),
            "maps_url": place.get("googleMapsUri"),
            "latitude": location.get("latitude"),
            "longitude": location.get("longitude"),
            "rating": place.get("rating"),
            "user_rating_count": place.get("userRatingCount"),
            "opening_hours": opening_hours.get("weekdayDescriptions"),
        }
    else:
        result = None

    with _CACHE_LOCK:
        if len(_PLACE_CACHE) >= _CACHE_MAX_ITEMS:
            _PLACE_CACHE.pop(next(iter(_PLACE_CACHE)))
        _PLACE_CACHE[cache_key] = (time.monotonic() + _CACHE_TTL_SECONDS, result)
    return result
