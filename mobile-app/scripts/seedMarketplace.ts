import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';
config();

const app = initializeApp({
  projectId: process.env.VITE_FIREBASE_PROJECT_ID
});
const db = getFirestore(app);

async function run() {
  // Use a known user or some hardcoded fake users
  const sellerId = 'P0T9ZqVpQpMW99ZJ1c9T0uL1pQ42'; // Just an example, let's look for a valid user or just use a fake string. Actually, to see the profiles properly we should get an existing user.
  
  const usersSnap = await db.collection('users').limit(1).get();
  const sellerUid = usersSnap.docs[0]?.id || 'fake_uid';

  const items = [
    {
      sellerId: sellerUid,
      title: 'BBS RS Wheels 17x9',
      description: 'Classic BBS RS 3-piece wheels. Original condition, some minor curb rash on one wheel but otherwise perfect. Tires included (70% tread).',
      price: 2500,
      currency: '$',
      category: 'Wheels',
      condition: 'Used - Good',
      location: 'Los Angeles, CA',
      mediaUrls: ['https://images.unsplash.com/photo-1623869911910-c5180db61b36?auto=format&fit=crop&q=80&w=800'],
      status: 'available',
      createdAt: Date.now() - 100000
    },
    {
      sellerId: sellerUid,
      title: 'Garrett GTX3071R Gen II',
      description: 'Brand new in box Garrett GTX3071R turbo. Never installed. Going a different route with the build.',
      price: 1800,
      currency: '$',
      category: 'Engine',
      condition: 'New',
      location: 'Austin, TX',
      mediaUrls: ['https://images.unsplash.com/photo-1616423640778-28d1b53229bd?auto=format&fit=crop&q=80&w=800'],
      status: 'available',
      createdAt: Date.now() - 50000
    },
    {
      sellerId: sellerUid,
      title: 'Ohlins Road & Track Coilovers',
      description: 'Used for about 5k miles. Perfect working order. Spring rates are 10k/8k.',
      price: 1850,
      currency: '$',
      category: 'Suspension',
      condition: 'Used - Like New',
      location: 'Miami, FL',
      make: 'BMW',
      model: 'M3 (F80)',
      mediaUrls: [],
      status: 'sold',
      createdAt: Date.now() - 200000
    }
  ];

  for (const item of items) {
    await db.collection('marketplace').add(item);
  }
  console.log('Seeded marketplace');
}

run().catch(console.error);
