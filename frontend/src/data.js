

const rating = 4.8;

const reviewCount = 24;
const experienceYears = 6;
const jobsCompleted = 142;
const isVerified = true;
const isFeatured = true;
const earnings = 52000;

// Pricing fields removed from the app; keep constants minimal.
const hourlyRate = undefined;

export const SERVICE_CATEGORIES= [

  {
    id: 'electrician',
    name: 'Electrician',
    iconName: 'Zap',
    image: '/images/electrician-service.png',
    description: 'Certified electricians for wiring, fixtures, switchboards, and power failures.',
    popularIssues: ['Short circuit fixing', 'Fan installation', 'Switchboard repair', 'Complete home rewiring', 'Inverter setup']
  },
  {
    id: 'plumber',
    name: 'Plumber',
    iconName: 'Droplet',
    image: '/images/plumber-service.png',
    description: 'Expert plumbing for leakages, pipe blockages, taps, basin installs, and pumps.',
    popularIssues: ['Tap leakage repair', 'Drain blockage removal', 'Water meter install', 'Bathroom fittings', 'Water tank repair']
  },
  {
    id: 'ac-repair',
    name: 'AC Repair',
    iconName: 'Wind',
    image: '/images/ac-repair-service.png',
    description: 'Deep AC filter clean, gas charging, cooling restoration, and system installations.',
    popularIssues: ['AC deep servicing', 'Gas leakage refill', 'Cooling troubleshooting', 'AC uninstallation', 'Noise correction']
  },
  {
    id: 'home-cleaning',
    name: 'Home Cleaning',
    iconName: 'Sparkles',
    image: '/images/home-cleaning-service.png',
    description: 'Dusting, mopping, bathroom scrubbing, kitchen cleaning & trash handling.',
    popularIssues: ['Regular 2BHK cleaning', 'Regular 3BHK cleaning', 'Kitchen deep scrubbing', 'Bathroom disinfection']
  },
  {
    id: 'deep-cleaning',
    name: 'Deep Cleaning',
    iconName: 'FlameKindling', // fallback or customized brush
    image: '/images/deep-cleaning-service.png',
    description: 'Thorough sanitation, steam vacuuming, hard water stain removal, and sofa shampooing.',
    popularIssues: ['Full villa deep cleaning', 'Sofa & carpet shampoo', 'Balcony pressure wash', 'Move-out thorough cleaning']
  },
  {
    id: 'painting',
    name: 'Painting',
    iconName: 'Paintbrush',
    image: '/images/painting-service.png',
    description: 'Premium wall texture, wall putty, interior/exterior painting with free masking service.',
    popularIssues: ['Single accent wall design', 'Full apartment painting', 'Waterproofing & crack filling', 'Wall stencil art']
  },
  {
    id: 'appliance-repair',
    name: 'Appliance Repair',
    iconName: 'Tv',
    image: '/images/appliance-repair-service.png',
    description: 'Quick diagnostics and genuine spare parts for washing machines, TVs, and refrigerators.',
    popularIssues: ['Washing machine spin issue', 'Refrigerator not-cooling', 'Microwave oven healing', 'Chimney filter cleanup']
  },
  {
    id: 'carpentry',
    name: 'Carpentry',
    iconName: 'Hammer',
    image: '/images/carpentry-service.png',
    description: 'Woodwork repairs, hinge replacement, custom wardrobe design, and alignment fixes.',
    popularIssues: ['Door hinge replacement', 'Wardrobe latch repair', 'Custom shelves installation', 'Bed assembly / alignment']
  },
  {
    id: 'home-maintenance',
    name: 'Home Maintenance',
    iconName: 'Wrench',
    image: '/images/home-maintenance-service.png',
    description: 'General handyman tasks, wall mounting, lock replacements, and minor repairs.',
    popularIssues: ['TV wall mounting', 'Curtain rod installation', 'Door lock replacement', 'Mirror / painting hanging']
  }
];

export const INITIAL_PROVIDERS = [

  // ELECTRICIANS
  {
    id: 'p1',
    name: 'KSR Electricals (Srinivas Rao)',
    email: 'srinivas.ksr@servego.com',
    phone: '9848022311',
    avatar: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150',
    category: 'Electrician',
    rating,
    reviewCount,
    experienceYears,
    jobsCompleted,
    bio: 'Professional licensed electrician trained under industrial standards. Specializes in residential troubleshooting, smart home switch conversions, and complex electrical diagnostics. Committed to speed and electrical safety.',
    specialties: ['Smart Switches Setup', 'Inverter Repairs', 'Short Circuit Detection', '3-Phase Panel Wiring'],
    serviceAreas: ['Gachibowli', 'Madhapur', 'Jubilee Hills', 'Kondapur', 'Kukatpally'],
    isVerified,
    isFeatured,
    avatarColor: 'bg-amber-100 text-amber-800',
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    timeSlots: ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM', '06:00 PM'],
    earnings,
    reviews: [{ id: 'r1_1', reviewerName: 'Rohan Sharma', rating, comment: 'Excellent prompt service Came in 30 mins to Jubilee Hills and fixed the main trip load switch perfectly.', date: '2026-05-24', serviceCategory: 'Electrician' },
      { id: 'r1_2', reviewerName: 'Prathyusha N', rating, comment: 'Very careful and clean work. Installed 3 smart geyser panels efficiently.', date: '2026-05-12', serviceCategory: 'Electrician' }
    ]
  },
  {
    id: 'p2',
    name: 'Rahim Electronics',
    email: 'rahim.elec@servego.com',
    phone: '9121087456',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150',
    category: 'Electrician',
    rating,
    reviewCount,
    experienceYears,
    jobsCompleted,
    bio: 'Punctual electrician specializing in energy-efficient lighting designs, emergency repairs, and power outages. Serving the wider Gachibowli community with immediate response times.',
    specialties: ['Energy Saving LEDs', 'Fan & Geyser Installation', 'Switchboard Repair'],
    serviceAreas: ['Gachibowli', 'Kondapur', 'Banjara Hills', 'Begumpet'],
    isVerified,
    isFeatured,
    avatarColor: 'bg-blue-100 text-blue-800',
    availableDays: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    timeSlots: ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM'],
    earnings,
    reviews: [{ id: 'r2_1', reviewerName: 'Madhav G', rating, comment: 'Fixed the faulty wiring in my kitchen cabinet within an hour. Highly professional.', date: '2026-05-19', serviceCategory: 'Electrician' }]
  },

  // PLUMBERS
  {

    id: 'p3',
    name: 'Super Leak-Fix Plumbers (Sanjay Kumar)',
    email: 'sanjay.plumb@servego.com',
    phone: '9966144889',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    category: 'Plumber',
    rating,
    reviewCount,
    experienceYears,
    jobsCompleted,
    bio: 'Lead plumbing engineer specializing in premium sanitary fixture layouts, underground leak detection using audio-sensors, and water pressure optimization across villas.',
    specialties: ['Acoustic Leak Detection', 'Pressure Pump Calibration', 'Luxury Shower Panels', 'Drain Clearing'],
    serviceAreas: ['Jubilee Hills', 'Banjara Hills', 'Madhapur', 'Begumpet', 'Secunderabad'],
    isVerified,
    isFeatured,
    avatarColor: 'bg-emerald-100 text-emerald-800',
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    timeSlots: ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM', '06:00 PM'],
    earnings,
    reviews: [{ id: 'r3_1', reviewerName: 'Anand Kumar', rating, comment: 'Sanjay detected the leak inside our drawing-room wall without breaking any tiles. Brilliant engineering', date: '2026-05-28', serviceCategory: 'Plumber' },
      { id: 'r3_2', reviewerName: 'Preeti G', rating, comment: 'Replaced five washbasin taps with high-quality Jaquar fittings. Fast and neat.', date: '2026-05-15', serviceCategory: 'Plumber' }
    ]
  },
  {
    id: 'p4',
    name: 'Reddy Plumbing Services',
    email: 'reddy.plumbing@servego.com',
    phone: '9490155609',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    category: 'Plumber',
    rating,
    reviewCount,
    experienceYears,
    jobsCompleted,
    bio: 'Friendly domestic plumber focusing on pocket-friendly, quality tap fixes, drainage block clearance, and sink repairs. Instant booking confirmation.',

    specialties: ['Drain Water Cleansing', 'Sink / Washbasin Fitting', 'Flush Valve Repair'],
    serviceAreas: ['Kukatpally', 'Kondapur', 'Madhapur', 'Secunderabad'],
    isVerified,
    isFeatured,
    avatarColor: 'bg-emerald-100 text-emerald-800',
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    timeSlots: ['11:00 AM', '02:00 PM', '04:00 PM', '06:00 PM'],
    earnings,
    reviews: [{ id: 'r4_1', reviewerName: 'Swathi Rao', rating, comment: 'Punctual Reddy plumbing resolved a stubborn bathroom block perfectly.', date: '2026-05-21', serviceCategory: 'Plumber' }]
  },

  // AC REPAIR & SERVICE
  {
    id: 'p5',
    name: 'Apex Aircon AC Solutions',
    email: 'apex.ac@servego.com',
    phone: '9849511223',
    avatar: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150',
    category: 'AC Repair',
    rating,
    reviewCount,
    experienceYears,
    jobsCompleted,
    bio: 'Specialist HVAC technicians trained in premium brands (Daikin, Mitsubishi, Voltas, O General). Equipped with high-pressure jet wash kits for deep AC indoor/outdoor block cooling servicing.',

    specialties: ['Jet Pump Servicing', 'R32 Gas Charging', 'Compressor Rebuilding', 'Inverter AC Troubleshooting'],
    serviceAreas: ['Gachibowli', 'Madhapur', 'Kondapur', 'Jubilee Hills', 'Begumpet'],
    isVerified,
    isFeatured,
    avatarColor: 'bg-sky-100 text-sky-800',
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    timeSlots: ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM', '06:00 PM'],
    earnings,
    reviews: [{ id: 'r5_1', reviewerName: 'Karthik Rao', rating, comment: 'Highly effective jet cleaning. The bedroom AC was lukewarm, now cooling perfectly at 18 degrees', date: '2026-05-30', serviceCategory: 'AC Repair' }]
  },

  // HOME CLEANING & DEEP CLEANING
  {
    id: 'p6',
    name: 'Sparkle Cleaners (Anitha Reddy)',
    email: 'anitha.sparkle@servego.com',
    phone: '9550519822',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    category: 'Home Cleaning',
    rating,
    reviewCount,
    experienceYears,
    jobsCompleted,

    bio: 'Our squad uses eco-friendly, hypoallergenic disinfected chemicals. We clean, sanitize, and de-dust bedrooms, kitchens, and toilets. High-end equipment like Karcher steamers and industrial vacuum cleaners included.',
    specialties: ['Kitchen Disgorging', 'Mattress Vacuuming', 'Tile Grout Cleansing', 'Pet Hair Extraction'],
    serviceAreas: ['Gachibowli', 'Madhapur', 'Jubilee Hills', 'Banjara Hills', 'Kondapur', 'Kukatpally', 'Begumpet'],
    isVerified,
    isFeatured,
    avatarColor: 'bg-purple-100 text-purple-800',
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    timeSlots: ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM'],
    earnings,
    reviews: [{ id: 'r6_1', reviewerName: 'Shekhar Sen', rating, comment: 'Amazing 3-member team. Swept through my 3BHK flat in Madhapur and left it looking completely new.', date: '2026-05-29', serviceCategory: 'Home Cleaning' }]
  },
  {
    id: 'p7',
    name: 'Elite Shine Deep Cleaning',
    email: 'elite.deepclean@servego.com',
    phone: '9848523456',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
    category: 'Deep Cleaning',
    rating,
    reviewCount,
    experienceYears,
    jobsCompleted,
    hourlyRate,
    bio: 'Heavy-duty deep-care experts specializing in premium residential deep sanitization, marble polishing, balcony pressure sprays, and luxury leather sofa shampoo treatment.',
    specialties: ['Marble Honing & Polish', 'Steam Stain Elimination', 'Sofa & Carpet Extraction'],
    serviceAreas: ['Jubilee Hills', 'Banjara Hills', 'Gachibowli'],
    isVerified,
    isFeatured,
    avatarColor: 'bg-rose-100 text-rose-800',
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    timeSlots: ['09:00 AM', '11:00 AM', '02:00 PM'],
    earnings,
    reviews: [{ id: 'r7_1', reviewerName: 'Vikas Madgula', rating, comment: 'Extraordinary. Worth every rupee for the deep marble steam wash in Jubilee Hills.', date: '2026-05-27', serviceCategory: 'Deep Cleaning' }]
  },

  // PAINTING
  {
    id: 'p8',
    name: 'Spectrum Master Painters',
    email: 'spectrum.paint@servego.com',
    phone: '9988112233',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    category: 'Painting',
    rating,
    reviewCount,
    experienceYears,
    jobsCompleted,
    hourlyRate,
    bio: 'Premium painting contractors helping design gorgeous homes with flawless texture coats and Royal Silk paints. Free furniture masking / dust protection covers included',
    specialties: ['Royal Silk Interior Finish', 'Furniture Masking Protection', 'Wall Putty Base Coats'],
    serviceAreas: ['Gachibowli', 'Jubilee Hills', 'Banjara Hills', 'Begumpet'],
    isVerified,
    isFeatured,
    avatarColor: 'bg-teal-100 text-teal-800',
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    timeSlots: ['09:00 AM', '11:00 AM', '02:00 PM'],
    earnings,
    reviews: [{ id: 'r8_1', reviewerName: 'Gayathri S', rating, comment: 'Beautiful texture job in my kids room. Masked all wardrobes carefully. No mess at all', date: '2026-05-18', serviceCategory: 'Painting' }]
  },

  // APPLIANCE REPAIR
  {
    id: 'p9',
    name: 'Smart Solutions (Washing Machine & Fridge Expert)',
    email: 'smart.appliances@servego.com',
    phone: '9701044321',
    avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=150',
    category: 'Appliance Repair',
    rating,
    reviewCount,
    experienceYears,
    jobsCompleted,
    hourlyRate,
    bio: 'Diagnosing board system repairs, drum suspension issues, and gas refill leaks for LG, Samsung, IFB, Whirlpool, and Bosch appliances.',
    specialties: ['Washing Machine Drum Alignment', 'Double Door Refrigerator Cooling', 'Genuine Spares Swap'],
    serviceAreas: ['Kndapur', 'Gachibowli', 'Madhapur', 'Kukatpally', 'Secunderabad'],
    isVerified,
    isFeatured,
    avatarColor: 'bg-zinc-100 text-zinc-800',
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    timeSlots: ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM', '06:00 PM'],
    earnings,
    reviews: [{ id: 'r9_1', reviewerName: 'Tashfeen Ali', rating, comment: 'Instantly diagnosed bad motor bearings on our Samsung washing machine. Fixed the vibration.', date: '2026-05-22', serviceCategory: 'Appliance Repair' }]
  },

  // CARPENTRY
  {
    id: 'p10',
    name: 'Sardar Woodworks (Baldev Singh)',
    email: 'baldev.singh@servego.com',
    phone: '9676110022',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    category: 'Carpentry',
    rating,
    reviewCount,
    experienceYears,
    jobsCompleted,
    hourlyRate,
    bio: 'Third-generation woodwright focusing on precision fittings, custom-made shelves, kitchen soft-close hydraulic hinge adjustments, and modular beds repair & resizing.',
    specialties: ['Hydraulic Hinge Adjusting', 'Precision Cut Shelves', 'MDF / Plywood Repair', 'Premium Wardrobe Latch Fitting'],
    serviceAreas: ['Kondapur', 'Madhapur', 'Gachibowli', 'Jubilee Hills', 'Kukatpally'],
    isVerified,
    isFeatured,
    avatarColor: 'bg-orange-100 text-orange-800',
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    timeSlots: ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM', '06:00 PM'],
    earnings,
    reviews: [{ id: 'r10_1', reviewerName: 'Nitin Roy', rating, comment: 'Baldev fixed my kitchen cabinet alignments perfectly. Highly recommended artisan', date: '2026-05-25', serviceCategory: 'Carpentry' }]
  },

  // GENERAL HOME MAINTENANCE
  {
    id: 'p11',
    name: 'Quick Handyman Hyderabad (Satish Prasad)',
    email: 'satish.handy@servego.com',
    phone: '9908123450',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    category: 'Home Maintenance',
    rating,
    reviewCount,
    experienceYears,
    jobsCompleted,
    hourlyRate,
    bio: 'One-stop professional for precise minor wall mounting, TV installations, curtain rail configurations, wall mirrors, photo grids, and domestic door locks upgrades.',
    specialties: ['Professional TV Art Wall Mount', 'Mirror/Clock Level Alignment', 'Safe Safety Locks Setup'],
    serviceAreas: ['Gachibowli', 'Madhapur', 'Kondapur', 'Kukatpally', 'Jubilee Hills', 'Banjara Hills'],
    isVerified,
    isFeatured,
    avatarColor: 'bg-red-100 text-red-800',
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    timeSlots: ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM', '06:00 PM'],
    earnings,
    reviews: [{ id: 'r11_1', reviewerName: 'Shruti V', rating, comment: 'Mounted our heavy 65" Sony TV securely. Used perfect centering tools. Fast and tidy.', date: '2026-05-26', serviceCategory: 'Home Maintenance' }]
  }
];

export const CITIES = ['Hyderabad', 'Bengaluru', 'Mumbai', 'Chennai', 'Delhi NCR'];
export const HYDERABAD_NEIGHBORHOODS = ['Gachibowli', 'Madhapur', 'Jubilee Hills', 'Banjara Hills', 'Kondapur', 'Kukatpally', 'Begumpet', 'Secunderabad'];
