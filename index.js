const express = require('express');
const bodyParser = require('body-parser');
const firebaseAdmin = require('firebase-admin');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();
console.log(process.env.GOOGLE_CREDENTIALS);

// Initialize Firebase using the environment variable
const serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount)
});
const db = firebaseAdmin.firestore();

const app = express();
app.use(bodyParser.json());

app.get('/flights', async (req, res) => {
  try {
    const {
      available_seats,
      booked_seats,
      class: flightClass,
      created_at,
      departure_date,
      departure_time_start,
      departure_time_end,
      arrival_time_start,
      arrival_time_end,
      facilities,
      from_location,
      number,
      min_price,
      max_price,
      return_date,
      return_time,
      seat_available,
      seat_max,
      to_location,
      sort_by,
      sort_order
    } = req.query;

    let query = db.collection('FlightBooking');

    // Apply filters to the query
    if (available_seats) query = query.where('available_seats', 'array-contains-any', available_seats.split(',').map(Number));
    if (booked_seats) query = query.where('booked_seats', 'array-contains-any', booked_seats.split(',').map(Number));
    if (flightClass) query = query.where('class', '==', flightClass);
    if (created_at) query = query.where('created_at', '==', created_at);
    if (departure_date) query = query.where('departure_date', '==', departure_date);
    if (from_location) query = query.where('from_location', '==', from_location);
    if (number) query = query.where('number', '==', number);
    if (return_date) query = query.where('return_date', '==', return_date);
    if (return_time) query = query.where('return_time', '==', return_time);
    if (seat_available) query = query.where('seat_available', '==', Number(seat_available));
    if (seat_max) query = query.where('seat_max', '==', Number(seat_max));
    if (to_location) query = query.where('to_location', '==', to_location);

    // Execute the query
    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.status(404).send('No matching documents.');
    }

    // Process the results
    let flights = [];
    snapshot.forEach(doc => {
      let flight = doc.data();

      // Check facilities
      if (facilities) {
        const facilitiesArray = facilities.split(',');
        const hasAllFacilities = facilitiesArray.every(facility => 
          flight.facilities && flight.facilities.includes(facility)
        );
        if (!hasAllFacilities) return;
      }

      // Check price range
      if (min_price && flight.price < Number(min_price)) return;
      if (max_price && flight.price > Number(max_price)) return;

      // Check time ranges
      const departureTime = parseTime(flight.departure_time);
      const arrivalTime = parseTime(flight.arrival_time);

      const departureTimeStart = departure_time_start ? parseTime(departure_time_start) : null;
      const departureTimeEnd = departure_time_end ? parseTime(departure_time_end) : null;
      const arrivalTimeStart = arrival_time_start ? parseTime(arrival_time_start) : null;
      const arrivalTimeEnd = arrival_time_end ? parseTime(arrival_time_end) : null;

      const isDepartureTimeInRange = (!departureTimeStart || departureTime >= departureTimeStart) &&
                                     (!departureTimeEnd || departureTime <= departureTimeEnd);
      const isArrivalTimeInRange = (!arrivalTimeStart || arrivalTime >= arrivalTimeStart) &&
                                   (!arrivalTimeEnd || arrivalTime <= arrivalTimeEnd);

      if (isDepartureTimeInRange && isArrivalTimeInRange) {
        flights.push(flight);
      }
    });

    // Sort results
    if (sort_by) {
      const sortOrder = sort_order === 'desc' ? -1 : 1;
      if (sort_by === 'price') {
        flights.sort((a, b) => sortOrder * (a.price - b.price));
      } else if (sort_by === 'departureTime') {
        flights.sort((a, b) => sortOrder * (parseTime(a.departure_time) - parseTime(b.departure_time)));
      } else if (sort_by === 'arrivalTime') {
        flights.sort((a, b) => sortOrder * (parseTime(a.arrival_time) - parseTime(b.arrival_time)));
      }
    }

    if (flights.length === 0) {
      return res.status(404).send('No matching documents.');
    }

    res.status(200).json(flights);
  } catch (error) {
    console.error('Error querying documents:', error);
    res.status(500).send('Error querying documents');
  }
});

function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes).getTime();
}

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
