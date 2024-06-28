import random
import string
from datetime import datetime, timedelta
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase
cred = credentials.Certificate('flight-booking-86c1e-firebase-adminsdk-hed8c-a13a5125f6.json')  # Đường dẫn tới tệp JSON bạn đã tải xuống
firebase_admin.initialize_app(cred)
db = firestore.client()

# Sample data generation
locations = ['New York', 'London', 'Paris', 'Tokyo', 'Sydney']
classes = ['Economy', 'Business']
base_facilities = ['Air Conditioning', 'Food']  # Air Conditioning và Food được thêm mặc định
extra_facilities = {
    'Economy': ['WiFi'],
    'Business': ['WiFi', 'Coffee']
}

# Giá vé cố định
economy_prices = [50, 100, 150, 200, 250]
business_prices = [200, 250, 300, 350, 400]

# Hàm tạo số hiệu máy bay duy nhất
def generate_unique_flight_number(existing_numbers):
    while True:
        flight_number = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        if flight_number not in existing_numbers:
            existing_numbers.add(flight_number)
            return flight_number

# Hàm kiểm tra xem chuyến bay có trùng lặp hay không
def is_duplicate(flight, flights):
    for f in flights:
        if (f['departure_date'] == flight['departure_date'] and
            f['departure_time'] == flight['departure_time'] and
            f['from_location'] == flight['from_location'] and
            f['to_location'] == flight['to_location'] and
            f['class'] == flight['class'] and
            f['facilities'] == flight['facilities']):
            return True
    return False

def generate_flight_data():
    flights = []
    existing_numbers = set()
    for i in range(1000):
        while True:
            from_location = random.choice(locations)
            to_location = random.choice([loc for loc in locations if loc != from_location])
            departure_date = datetime.now() + timedelta(days=random.randint(1, 365))
            departure_time_obj = datetime.now() + timedelta(hours=random.randint(0, 23), minutes=random.randint(0, 59))
            departure_time = departure_time_obj.strftime('%H:%M')

            # Calculate arrival time
            flight_duration = timedelta(hours=random.randint(5, 10), minutes=random.randint(0, 59))
            arrival_time_obj = departure_time_obj + flight_duration
            arrival_time = arrival_time_obj.strftime('%H:%M')

            # 50% chance of being a round trip
            if random.choice([True, False]):
                return_date = departure_date + timedelta(days=random.randint(2, 7))
                return_time = (datetime.now() + timedelta(hours=random.randint(0, 23), minutes=random.randint(0, 59))).strftime('%H:%M')
            else:
                return_date = None
                return_time = None
            flight_class = random.choice(classes)
            seat_max = 24
            seat_available = random.randint(15, 24)
            price = random.choice(economy_prices) if flight_class == 'Economy' else random.choice(business_prices)
            facilities = base_facilities + extra_facilities[flight_class]
            created_at = datetime.now()

            # Generate booked seats and available seats
            booked_seats = random.sample(range(1, seat_max + 1), seat_max - seat_available)
            available_seats = [seat for seat in range(1, seat_max + 1) if seat not in booked_seats]

            flight_number = generate_unique_flight_number(existing_numbers)

            flight = {
                'from_location': from_location,
                'to_location': to_location,
                'departure_date': departure_date.strftime('%Y-%m-%d'),
                'departure_time': departure_time,
                'arrival_time': arrival_time,
                'return_date': return_date.strftime('%Y-%m-%d') if return_date else None,
                'return_time': return_time if return_time else None,
                'class': flight_class,
                'seat_max': seat_max,
                'seat_available': seat_available,
                'booked_seats': booked_seats,
                'available_seats': available_seats,
                'price': price,
                'facilities': facilities,
                'created_at': created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'number': flight_number
            }
            # Kiểm tra trùng lặp
            if not is_duplicate(flight, flights):
                flights.append(flight)
                break
    return flights

flights = generate_flight_data()

# Save to Firebase
for flight in flights:
    db.collection('FlightBooking').add(flight)

print("Data uploaded to Firebase.")
