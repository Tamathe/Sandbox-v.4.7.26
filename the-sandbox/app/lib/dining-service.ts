/**
 * Dining Integration — Static UK Dining Data + Status Computation
 *
 * 10 real UK dining locations with hours, coordinates, and synthetic menus.
 * All times computed in Eastern time zone.
 */

export interface DiningLocation {
  id: string
  name: string
  building: string
  type: 'all-you-care-to-eat' | 'retail' | 'cafe' | 'food-truck'
  mealPlanAccepted: boolean
  hours: Record<string, MealPeriodHours>
  coordinates?: { lat: number; lng: number }
}

interface MealPeriodHours {
  breakfast?: string
  lunch?: string
  dinner?: string
  brunch?: string
  lateNight?: string
}

export interface DiningStatus {
  location: DiningLocation
  isOpenNow: boolean
  currentMeal: string | null
  closesAt: string | null
  nextOpens: string | null
}

export interface MenuItem {
  name: string
  station: string
  dietaryTags: string[]
  allergens: string[]
}

export interface DiningMenu {
  locationId: string
  date: string
  meal: string
  items: MenuItem[]
}

// ── Static Dining Locations ────────────────────────────────────────────────

const DINING_LOCATIONS: DiningLocation[] = [
  {
    id: 'champions-kitchen',
    name: 'Champions Kitchen',
    building: 'Champions Kitchen',
    type: 'all-you-care-to-eat',
    mealPlanAccepted: true,
    hours: {
      monday: { breakfast: '7:00-10:00', lunch: '11:00-14:00', dinner: '17:00-20:00' },
      tuesday: { breakfast: '7:00-10:00', lunch: '11:00-14:00', dinner: '17:00-20:00' },
      wednesday: { breakfast: '7:00-10:00', lunch: '11:00-14:00', dinner: '17:00-20:00' },
      thursday: { breakfast: '7:00-10:00', lunch: '11:00-14:00', dinner: '17:00-20:00' },
      friday: { breakfast: '7:00-10:00', lunch: '11:00-14:00', dinner: '17:00-20:00' },
      saturday: { brunch: '10:00-14:00', dinner: '17:00-19:30' },
      sunday: { brunch: '10:00-14:00', dinner: '17:00-19:30' },
    },
    coordinates: { lat: 38.0285, lng: -84.5045 },
  },
  {
    id: 'the-90',
    name: 'The 90',
    building: 'Student Center',
    type: 'retail',
    mealPlanAccepted: true,
    hours: {
      monday: { lunch: '10:30-20:00' },
      tuesday: { lunch: '10:30-20:00' },
      wednesday: { lunch: '10:30-20:00' },
      thursday: { lunch: '10:30-20:00' },
      friday: { lunch: '10:30-20:00' },
      saturday: { lunch: '11:00-19:00' },
    },
    coordinates: { lat: 38.0389, lng: -84.5040 },
  },
  {
    id: 'blazer-dining',
    name: 'Blazer Dining',
    building: 'Blazer Hall',
    type: 'all-you-care-to-eat',
    mealPlanAccepted: true,
    hours: {
      monday: { breakfast: '7:00-10:00', lunch: '11:00-14:00', dinner: '17:00-20:00' },
      tuesday: { breakfast: '7:00-10:00', lunch: '11:00-14:00', dinner: '17:00-20:00' },
      wednesday: { breakfast: '7:00-10:00', lunch: '11:00-14:00', dinner: '17:00-20:00' },
      thursday: { breakfast: '7:00-10:00', lunch: '11:00-14:00', dinner: '17:00-20:00' },
      friday: { breakfast: '7:00-10:00', lunch: '11:00-14:00', dinner: '17:00-20:00' },
      saturday: { brunch: '10:00-14:00', dinner: '17:00-19:30' },
      sunday: { brunch: '10:00-14:00', dinner: '17:00-19:30' },
    },
    coordinates: { lat: 38.0310, lng: -84.5100 },
  },
  {
    id: 'ovids-cafe',
    name: "Ovid's Cafe",
    building: 'White Hall',
    type: 'cafe',
    mealPlanAccepted: false,
    hours: {
      monday: { lunch: '7:30-15:00' },
      tuesday: { lunch: '7:30-15:00' },
      wednesday: { lunch: '7:30-15:00' },
      thursday: { lunch: '7:30-15:00' },
      friday: { lunch: '7:30-15:00' },
    },
    coordinates: { lat: 38.0350, lng: -84.5055 },
  },
  {
    id: 'rising-roll',
    name: 'Rising Roll',
    building: 'Gatton College of Business',
    type: 'cafe',
    mealPlanAccepted: false,
    hours: {
      monday: { lunch: '7:30-15:00' },
      tuesday: { lunch: '7:30-15:00' },
      wednesday: { lunch: '7:30-15:00' },
      thursday: { lunch: '7:30-15:00' },
      friday: { lunch: '7:30-15:00' },
    },
    coordinates: { lat: 38.0305, lng: -84.5020 },
  },
  {
    id: 'einstein-bros',
    name: 'Einstein Bros Bagels',
    building: 'William T. Young Library',
    type: 'cafe',
    mealPlanAccepted: false,
    hours: {
      monday: { lunch: '7:30-15:00' },
      tuesday: { lunch: '7:30-15:00' },
      wednesday: { lunch: '7:30-15:00' },
      thursday: { lunch: '7:30-15:00' },
      friday: { lunch: '7:30-15:00' },
    },
    coordinates: { lat: 38.0325, lng: -84.5050 },
  },
  {
    id: 'chick-fil-a',
    name: 'Chick-fil-A',
    building: 'Student Center',
    type: 'retail',
    mealPlanAccepted: true,
    hours: {
      monday: { lunch: '10:30-20:00' },
      tuesday: { lunch: '10:30-20:00' },
      wednesday: { lunch: '10:30-20:00' },
      thursday: { lunch: '10:30-20:00' },
      friday: { lunch: '10:30-20:00' },
      saturday: { lunch: '11:00-19:00' },
    },
    coordinates: { lat: 38.0389, lng: -84.5042 },
  },
  {
    id: 'panda-express',
    name: 'Panda Express',
    building: 'Student Center',
    type: 'retail',
    mealPlanAccepted: true,
    hours: {
      monday: { lunch: '10:30-20:00' },
      tuesday: { lunch: '10:30-20:00' },
      wednesday: { lunch: '10:30-20:00' },
      thursday: { lunch: '10:30-20:00' },
      friday: { lunch: '10:30-20:00' },
      saturday: { lunch: '11:00-19:00' },
    },
    coordinates: { lat: 38.0389, lng: -84.5038 },
  },
  {
    id: 'starbucks',
    name: 'Starbucks',
    building: 'Student Center',
    type: 'cafe',
    mealPlanAccepted: false,
    hours: {
      monday: { lunch: '7:00-21:00' },
      tuesday: { lunch: '7:00-21:00' },
      wednesday: { lunch: '7:00-21:00' },
      thursday: { lunch: '7:00-21:00' },
      friday: { lunch: '7:00-21:00' },
      saturday: { lunch: '8:00-18:00' },
      sunday: { lunch: '8:00-18:00' },
    },
    coordinates: { lat: 38.0390, lng: -84.5041 },
  },
  {
    id: 'subway',
    name: 'Subway',
    building: 'Student Center',
    type: 'retail',
    mealPlanAccepted: true,
    hours: {
      monday: { lunch: '10:30-20:00' },
      tuesday: { lunch: '10:30-20:00' },
      wednesday: { lunch: '10:30-20:00' },
      thursday: { lunch: '10:30-20:00' },
      friday: { lunch: '10:30-20:00' },
      saturday: { lunch: '11:00-19:00' },
    },
    coordinates: { lat: 38.0388, lng: -84.5039 },
  },
]

// ── Synthetic Menu Data ────────────────────────────────────────────────────

const CHAMPIONS_MENUS: Record<string, MenuItem[]> = {
  breakfast: [
    { name: 'Scrambled Eggs', station: 'Grill', dietaryTags: ['gluten-free'], allergens: ['eggs'] },
    { name: 'Pancakes with Maple Syrup', station: 'Grill', dietaryTags: [], allergens: ['wheat', 'eggs', 'milk'] },
    { name: 'Turkey Sausage', station: 'Grill', dietaryTags: ['gluten-free'], allergens: [] },
    { name: 'Fresh Fruit Medley', station: 'Salad Bar', dietaryTags: ['vegan', 'gluten-free'], allergens: [] },
    { name: 'Oatmeal with Toppings', station: 'Cereal', dietaryTags: ['vegan'], allergens: ['wheat'] },
  ],
  lunch: [
    { name: 'Grilled Chicken Breast', station: 'Grill', dietaryTags: ['gluten-free'], allergens: [] },
    { name: 'Black Bean Burger', station: 'Grill', dietaryTags: ['vegan'], allergens: ['soy'] },
    { name: 'Caesar Salad', station: 'Salad Bar', dietaryTags: [], allergens: ['wheat', 'milk', 'eggs'] },
    { name: 'Tomato Basil Soup', station: 'Soups', dietaryTags: ['vegetarian'], allergens: ['milk'] },
    { name: 'Pepperoni Pizza', station: 'Pizza', dietaryTags: [], allergens: ['wheat', 'milk'] },
  ],
  dinner: [
    { name: 'Herb-Roasted Salmon', station: 'Entree', dietaryTags: ['gluten-free'], allergens: ['fish'] },
    { name: 'Vegetable Stir Fry', station: 'Entree', dietaryTags: ['vegan'], allergens: ['soy'] },
    { name: 'Mashed Potatoes', station: 'Sides', dietaryTags: ['vegetarian', 'gluten-free'], allergens: ['milk'] },
    { name: 'Steamed Broccoli', station: 'Sides', dietaryTags: ['vegan', 'gluten-free'], allergens: [] },
    { name: 'Chocolate Cake', station: 'Desserts', dietaryTags: ['vegetarian'], allergens: ['wheat', 'eggs', 'milk'] },
  ],
  brunch: [
    { name: 'Belgian Waffles', station: 'Grill', dietaryTags: [], allergens: ['wheat', 'eggs', 'milk'] },
    { name: 'Eggs Benedict', station: 'Grill', dietaryTags: [], allergens: ['wheat', 'eggs', 'milk'] },
    { name: 'Fresh Fruit Bar', station: 'Salad Bar', dietaryTags: ['vegan', 'gluten-free'], allergens: [] },
    { name: 'Chicken & Waffles', station: 'Grill', dietaryTags: [], allergens: ['wheat', 'eggs', 'milk'] },
  ],
}

const BLAZER_MENUS: Record<string, MenuItem[]> = {
  breakfast: [
    { name: 'Veggie Omelet', station: 'Grill', dietaryTags: ['vegetarian', 'gluten-free'], allergens: ['eggs', 'milk'] },
    { name: 'Bacon', station: 'Grill', dietaryTags: ['gluten-free'], allergens: [] },
    { name: 'Biscuits and Gravy', station: 'Southern', dietaryTags: [], allergens: ['wheat', 'milk'] },
    { name: 'Yogurt Parfait', station: 'Cereal', dietaryTags: ['vegetarian'], allergens: ['milk'] },
  ],
  lunch: [
    { name: 'BBQ Pulled Pork Sandwich', station: 'Grill', dietaryTags: [], allergens: ['wheat'] },
    { name: 'Garden Salad', station: 'Salad Bar', dietaryTags: ['vegan', 'gluten-free'], allergens: [] },
    { name: 'Mac and Cheese', station: 'Southern', dietaryTags: ['vegetarian'], allergens: ['wheat', 'milk'] },
    { name: 'Chicken Noodle Soup', station: 'Soups', dietaryTags: [], allergens: ['wheat', 'eggs'] },
  ],
  dinner: [
    { name: 'Grilled Steak', station: 'Entree', dietaryTags: ['gluten-free'], allergens: [] },
    { name: 'Eggplant Parmesan', station: 'Entree', dietaryTags: ['vegetarian'], allergens: ['wheat', 'milk', 'eggs'] },
    { name: 'Rice Pilaf', station: 'Sides', dietaryTags: ['vegan', 'gluten-free'], allergens: [] },
    { name: 'Garlic Bread', station: 'Sides', dietaryTags: ['vegetarian'], allergens: ['wheat', 'milk'] },
    { name: 'Brownie Sundae', station: 'Desserts', dietaryTags: ['vegetarian'], allergens: ['wheat', 'eggs', 'milk'] },
  ],
  brunch: [
    { name: 'French Toast Sticks', station: 'Grill', dietaryTags: [], allergens: ['wheat', 'eggs', 'milk'] },
    { name: 'Breakfast Burrito', station: 'Grill', dietaryTags: [], allergens: ['wheat', 'eggs', 'milk'] },
    { name: 'Hash Browns', station: 'Grill', dietaryTags: ['vegan', 'gluten-free'], allergens: [] },
  ],
}

// ── Time Helpers ────────────────────────────────────────────────────────────

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function getEasternNow(): { hour: number; minute: number; dayName: string } {
  const str = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
  const d = new Date(str)
  return {
    hour: d.getHours(),
    minute: d.getMinutes(),
    dayName: DAY_NAMES[d.getDay()],
  }
}

function parseTimeRange(range: string): { startH: number; startM: number; endH: number; endM: number } {
  const [start, end] = range.split('-')
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return { startH: sh, startM: sm, endH: eh, endM: em }
}

function isWithinRange(hour: number, minute: number, range: string): boolean {
  const { startH, startM, endH, endM } = parseTimeRange(range)
  const nowMinutes = hour * 60 + minute
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM
  return nowMinutes >= startMinutes && nowMinutes < endMinutes
}

function formatTime(h: number, m: number): string {
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  return m === 0 ? `${displayH} ${period}` : `${displayH}:${m.toString().padStart(2, '0')} ${period}`
}

// ── Core Functions ──────────────────────────────────────────────────────────

function computeStatus(location: DiningLocation): DiningStatus {
  const { hour, minute, dayName } = getEasternNow()
  const dayHours = location.hours[dayName]

  if (!dayHours) {
    // Closed today — find next opening
    const nextOpens = findNextOpening(location, dayName)
    return { location, isOpenNow: false, currentMeal: null, closesAt: null, nextOpens }
  }

  // Check each meal period
  const meals = Object.entries(dayHours) as [string, string][]
  for (const [meal, range] of meals) {
    if (isWithinRange(hour, minute, range)) {
      const { endH, endM } = parseTimeRange(range)
      return {
        location,
        isOpenNow: true,
        currentMeal: meal.charAt(0).toUpperCase() + meal.slice(1),
        closesAt: formatTime(endH, endM),
        nextOpens: null,
      }
    }
  }

  // Not currently open but may have a later period today
  for (const [, range] of meals) {
    const { startH, startM } = parseTimeRange(range)
    const nowMin = hour * 60 + minute
    const startMin = startH * 60 + startM
    if (startMin > nowMin) {
      return {
        location,
        isOpenNow: false,
        currentMeal: null,
        closesAt: null,
        nextOpens: formatTime(startH, startM),
      }
    }
  }

  // Past all periods today
  const nextOpens = findNextOpening(location, dayName)
  return { location, isOpenNow: false, currentMeal: null, closesAt: null, nextOpens }
}

function findNextOpening(location: DiningLocation, currentDay: string): string | null {
  const currentIdx = DAY_NAMES.indexOf(currentDay)
  for (let offset = 1; offset <= 7; offset++) {
    const nextDay = DAY_NAMES[(currentIdx + offset) % 7]
    const dayHours = location.hours[nextDay]
    if (dayHours) {
      const firstMeal = Object.values(dayHours)[0]
      if (firstMeal) {
        const { startH, startM } = parseTimeRange(firstMeal)
        const dayLabel = offset === 1 ? 'Tomorrow' : nextDay.charAt(0).toUpperCase() + nextDay.slice(1)
        return `${dayLabel} ${formatTime(startH, startM)}`
      }
    }
  }
  return null
}

export async function getDiningStatus(): Promise<DiningStatus[]> {
  const statuses = DINING_LOCATIONS.map(computeStatus)
  // Sort: open first, then alphabetical
  statuses.sort((a, b) => {
    if (a.isOpenNow && !b.isOpenNow) return -1
    if (!a.isOpenNow && b.isOpenNow) return 1
    return a.location.name.localeCompare(b.location.name)
  })
  return statuses
}

export async function getDiningMenu(locationId: string, meal?: string): Promise<DiningMenu | null> {
  const menus = locationId === 'champions-kitchen'
    ? CHAMPIONS_MENUS
    : locationId === 'blazer-dining'
      ? BLAZER_MENUS
      : null

  if (!menus) return null

  const { dayName } = getEasternNow()
  const dayHours = DINING_LOCATIONS.find(l => l.id === locationId)?.hours[dayName]
  const mealKey = meal?.toLowerCase() || (dayHours ? Object.keys(dayHours)[0] : 'lunch')
  const items = menus[mealKey || 'lunch']

  if (!items) return null

  return {
    locationId,
    date: new Date().toISOString().split('T')[0],
    meal: mealKey || 'lunch',
    items,
  }
}

export async function getNearestOpenDining(building?: string): Promise<DiningStatus | null> {
  const statuses = await getDiningStatus()
  const openStatuses = statuses.filter(s => s.isOpenNow)
  if (openStatuses.length === 0) return null

  if (!building) return openStatuses[0]

  // Simple name-matching heuristic for building
  const buildingLower = building.toLowerCase()
  const inBuilding = openStatuses.find(s =>
    s.location.building.toLowerCase().includes(buildingLower) ||
    buildingLower.includes(s.location.building.toLowerCase())
  )
  if (inBuilding) return inBuilding

  // Default: return first open location (already sorted by open status + name)
  return openStatuses[0]
}
