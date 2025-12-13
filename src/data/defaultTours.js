// Default tour programs for the fleet management system
export const defaultTours = [
  {
    id: 'city-1-5h',
    name: 'City Tour – 1.5 Hours',
    duration: 90, // minutes
    availableTimes: ['10:00 AM', '2:00 PM', '6:00 PM'],
    price: 150,
    pricePerPerson: 150,
    defaultGuide: null,
    category: 'city',
    icon: '🏙️',
    description: 'Explore the city highlights in a compact 1.5-hour adventure',
    maxParticipants: 8,
    minParticipants: 2,
    equipment: ['Safety gear', 'Helmets', 'Communication devices'],
    route: 'City center, historical landmarks, scenic viewpoints',
    difficulty: 'Easy',
    active: true
  },
  {
    id: 'city-2h',
    name: 'City Tour – 2 Hours',
    duration: 120, // minutes
    availableTimes: ['11:00 AM', '3:00 PM'],
    price: 200,
    pricePerPerson: 200,
    defaultGuide: null,
    category: 'city',
    icon: '🏙️',
    description: 'Extended city exploration with more stops and photo opportunities',
    maxParticipants: 10,
    minParticipants: 2,
    equipment: ['Safety gear', 'Helmets', 'Communication devices', 'Water bottles'],
    route: 'Extended city circuit, cultural sites, local markets',
    difficulty: 'Easy',
    active: true
  },
  {
    id: 'mountain-1h',
    name: 'Mountain Tour – 1 Hour',
    duration: 60, // minutes
    availableTimes: ['10:00 AM', '12:00 PM', '4:00 PM'],
    price: 120,
    pricePerPerson: 120,
    defaultGuide: null,
    category: 'mountain',
    icon: '⛰️',
    description: 'Quick mountain adventure with stunning views',
    maxParticipants: 6,
    minParticipants: 2,
    equipment: ['Safety gear', 'Helmets', 'First aid kit'],
    route: 'Mountain trails, scenic overlooks, natural landmarks',
    difficulty: 'Medium',
    active: true
  },
  {
    id: 'mountain-2h',
    name: 'Mountain Tour – 2 Hours',
    duration: 120, // minutes
    availableTimes: ['1:00 PM', '5:00 PM'],
    price: 180,
    pricePerPerson: 180,
    defaultGuide: null,
    category: 'mountain',
    icon: '⛰️',
    description: 'Extended mountain expedition with challenging terrain',
    maxParticipants: 8,
    minParticipants: 2,
    equipment: ['Safety gear', 'Helmets', 'First aid kit', 'Emergency supplies'],
    route: 'Advanced mountain trails, summit viewpoints, wilderness areas',
    difficulty: 'Hard',
    active: true
  }
];

// Tour categories for filtering
export const tourCategories = [
  { id: 'city', name: 'City Tours', icon: '🏙️', color: 'blue' },
  { id: 'mountain', name: 'Mountain Tours', icon: '⛰️', color: 'green' },
  { id: 'custom', name: 'Custom Tours', icon: '⚙️', color: 'gray' }
];

// Difficulty levels
export const difficultyLevels = [
  { id: 'easy', name: 'Easy', color: 'green' },
  { id: 'medium', name: 'Medium', color: 'yellow' },
  { id: 'hard', name: 'Hard', color: 'red' }
];