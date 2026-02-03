import requests
import json

# Backend URL
BACKEND_URL = "http://localhost:5000"

# Test coordinates - NYC
test_locations = {
    "NYC": {
        "latitude": 40.7128,
        "longitude": -74.0060,
        "radius": 5000
    },
    "San Francisco": {
        "latitude": 37.7749,
        "longitude": -122.4194,
        "radius": 3000
    },
    "Los Angeles": {
        "latitude": 34.0522,
        "longitude": -118.2437,
        "radius": 5000
    },
    "Delhi": {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "radius": 5000
    }
}

def test_health():
    """Test health endpoint"""
    print("\n" + "="*60)
    print("Testing Health Endpoint")
    print("="*60)
    try:
        response = requests.get(f"{BACKEND_URL}/health")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_random_restaurant(location_name, latitude, longitude, radius):
    """Test random restaurant endpoint"""
    print("\n" + "="*60)
    print(f"Testing Random Restaurant - {location_name}")
    print("="*60)
    
    headers = {
        "Content-Type": "application/json"
    }
    
    payload = {
        "latitude": latitude,
        "longitude": longitude,
        "radius": radius
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/random-restaurant",
            headers=headers,
            json=payload
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response:")
        print(json.dumps(response.json(), indent=2))
        
        return response.status_code == 200
        
    except Exception as e:
        print(f"Error: {e}")
        return False

def main():
    print("\n🍽️  SpinDine Backend Test Suite")
    print("Testing with Foursquare Places API\n")
    
    # Test health endpoint
    health_ok = test_health()
    
    if not health_ok:
        print("\n❌ Backend is not running! Start it with: npm start")
        return
    
    print("\n✅ Backend is running!")
    
    # Test with different locations
    all_passed = True
    for location_name, coords in test_locations.items():
        success = test_random_restaurant(
            location_name,
            coords["latitude"],
            coords["longitude"],
            coords["radius"]
        )
        all_passed = all_passed and success
    
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    if all_passed:
        print("✅ All tests passed!")
    else:
        print("❌ Some tests failed. Check the errors above.")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
