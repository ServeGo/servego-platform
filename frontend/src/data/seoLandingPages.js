// SEO landing page data for service + city pages.
// Each entry drives: title, description, H1, H2s, FAQs, schema, internal links.
// Keep content factual — no fake stats, no superlatives.

export const SEO_SERVICE_PAGES = {
  electrician: {
    name: 'Electrician Services',
    shortName: 'Electrician',
    title: 'Electrician in Hyderabad – Book Local Electrical Help | ServeGo24',
    description:
      'Need an electrician in Hyderabad? Book help for switches, fans, wiring, lights and other home electrical work through ServeGo24. Fast dispatch, transparent pricing.',
    h1: 'Electrician Services in Hyderabad',
    intro:
      'Get help with everyday electrical work at home — from a faulty switch or fan to new lights and minor wiring repairs. Share your requirement and location so ServeGo24 can connect you with available electricians in Hyderabad.',
    problems: [
      'Switches, sockets and lights not working',
      'Fan, exhaust or ceiling fixture installation',
      'Minor wiring and electrical repairs',
      'Power interruptions inside the home',
      'MCB tripping or fuse issues',
      'New plug point or extension fitting',
    ],
    faqs: [
      {
        q: 'How quickly can I get an electrician in Hyderabad?',
        a: 'Availability depends on your area and time of request. ServeGo24 broadcasts your request to nearby verified electricians and you will be notified once one accepts.',
      },
      {
        q: 'What electrical work can I request through ServeGo24?',
        a: 'You can request help for switches, sockets, fans, lights, minor wiring repairs, MCB issues, and other standard home electrical work. For large rewiring or new construction work, describe the scope clearly when booking.',
      },
      {
        q: 'Is the electrician verified?',
        a: 'All service professionals on ServeGo24 go through an identity and skills verification process before they are approved to take bookings.',
      },
      {
        q: 'How is pricing decided for electrical work?',
        a: 'Pricing depends on the type of work, parts required and time taken. You can discuss the scope and expected cost with the professional before confirming the booking.',
      },
    ],
    related: ['plumber', 'ac-repair', 'cctv-installation'],
    localContext:
      'In Hyderabad, electrical requests commonly involve apartment fixtures, fans, switches, sockets and small wiring faults. Share the building or neighbourhood and whether the issue affects one room or the whole property so the professional arrives with better context.',
    included: ['Fault diagnosis', 'Switch, socket and light repairs', 'Fan and fixture installation', 'Minor wiring and MCB checks'],
    priceFactors: 'The final cost depends on the fault, labour time, access, replacement parts and whether the job needs additional materials. Confirm the scope and price with the professional before work begins.',
    serviceSchema: 'ElectricalContractor',
  },

  plumber: {
    name: 'Plumbing Services',
    shortName: 'Plumber',
    title: 'Plumber in Hyderabad – Home Plumbing Repair & Service | ServeGo24',
    description:
      'Book a plumber in Hyderabad for tap leaks, blocked drains, pipe repairs and common household plumbing work. ServeGo24 connects you with verified local plumbers.',
    h1: 'Plumbing Services in Hyderabad',
    intro:
      'ServeGo24 helps Hyderabad households request practical plumbing support for leaks, blockages, fittings and other routine repairs. Describe the issue clearly to get the right service conversation started.',
    problems: [
      'Leaking taps, pipes or connections',
      'Blocked sinks, drains and toilets',
      'Bathroom and kitchen fitting repairs',
      'Water flow and pressure problems',
      'Geyser and water heater connections',
      'Overhead tank and pipeline issues',
    ],
    faqs: [
      {
        q: 'Can I book a plumber for an emergency leak in Hyderabad?',
        a: 'Yes. Submit your request through ServeGo24 and describe the urgency. Available plumbers in your area will be notified immediately.',
      },
      {
        q: 'What plumbing problems can ServeGo24 help with?',
        a: 'Leaking taps, blocked drains, pipe repairs, bathroom fittings, geyser connections, and other standard household plumbing work.',
      },
      {
        q: 'Do I need to provide materials for plumbing repairs?',
        a: 'For minor repairs the professional may carry common fittings. For larger jobs, discuss material requirements before the visit so there are no delays.',
      },
    ],
    related: ['electrician', 'ac-repair', 'home-cleaning'],
    localContext:
      'Hyderabad homes and apartments can have very different pipe layouts, water pressure and access points. Include the room, fixture and whether water is actively leaking or only draining slowly when you request help.',
    included: ['Leak detection and repair', 'Tap, sink and toilet work', 'Drain blockage assistance', 'Pipe, fitting and geyser connection checks'],
    priceFactors: 'Pricing depends on the location of the fault, access, labour time and parts such as valves, traps or connectors. Ask what materials are needed before approving additional work.',
    serviceSchema: 'Plumber',
  },

  'ac-repair': {
    name: 'AC Repair and Service',
    shortName: 'AC Repair',
    title: 'AC Repair & Service in Hyderabad – Split & Window AC | ServeGo24',
    description:
      'Book AC repair or servicing in Hyderabad for cooling problems, water leaks, unusual noise and routine maintenance. ServeGo24 connects you with verified AC technicians.',
    h1: 'AC Repair and Service in Hyderabad',
    intro:
      'When an air conditioner is not cooling properly, leaking water or making unusual noise, a technician can help identify the cause. Use ServeGo24 to describe the problem and request AC service in Hyderabad.',
    problems: [
      'AC not cooling as expected',
      'Water dripping or leakage from indoor unit',
      'Unusual noise or vibration',
      'AC not turning on or remote not working',
      'Routine split AC and window AC servicing',
      'AC gas-related issues (requires professional assessment)',
    ],
    faqs: [
      {
        q: 'How often should AC servicing be done?',
        a: 'Most manufacturers recommend servicing split and window ACs at least once a year, ideally before summer. Regular cleaning of filters improves cooling efficiency and reduces electricity consumption.',
      },
      {
        q: 'Why is my AC not cooling even after servicing?',
        a: 'Possible reasons include low refrigerant, a dirty condenser coil, a faulty compressor or blocked airflow. A technician will inspect and diagnose the specific cause.',
      },
      {
        q: 'Can ServeGo24 help with both split and window AC repairs?',
        a: 'Yes. You can request service for split ACs, window ACs and cassette ACs. Mention the type and brand when booking.',
      },
      {
        q: 'What is the cost of AC servicing in Hyderabad?',
        a: 'Service charges depend on the type of work, AC model and parts required. Discuss the expected cost with the technician before the work begins.',
      },
    ],
    related: ['electrician', 'plumber', 'home-cleaning'],
    localContext:
      'During Hyderabad summer, a cooling complaint may be caused by airflow, filters, outdoor-unit conditions, refrigerant or an electrical component. Mention the AC type, brand, last service and whether the unit is leaking or tripping power.',
    included: ['Cooling and airflow diagnosis', 'Split and window AC servicing', 'Indoor-unit leakage checks', 'Noise, power and remote-related checks'],
    priceFactors: 'The cost depends on the diagnosis, AC type, cleaning level, labour and any parts or refrigerant required. A technician should inspect the unit before recommending a repair or refill.',
    serviceSchema: 'HVACBusiness',
  },

  'home-cleaning': {
    name: 'Home Cleaning Services',
    shortName: 'Home Cleaning',
    title: 'Home Cleaning Services in Hyderabad – Deep Clean & Regular | ServeGo24',
    description:
      'Book home cleaning in Hyderabad for regular cleaning, deep cleaning, kitchen and bathroom cleaning. ServeGo24 connects you with verified local cleaning professionals.',
    h1: 'Home Cleaning Services in Hyderabad',
    intro:
      'Choose the kind of cleaning help your home needs — from a regular visit to a more detailed clean of selected rooms. Availability and scope can be discussed before the booking is confirmed.',
    problems: [
      'Regular household cleaning',
      'Deep cleaning before or after a move',
      'Kitchen cleaning and degreasing',
      'Bathroom deep cleaning',
      'Sofa and upholstery cleaning',
      'Dust and buildup in frequently used areas',
    ],
    faqs: [
      {
        q: 'What is included in a home deep cleaning service?',
        a: 'Deep cleaning typically covers all rooms including kitchen, bathrooms, floors, surfaces and hard-to-reach areas. The exact scope depends on the service selected and the size of your home.',
      },
      {
        q: 'Do I need to provide cleaning supplies?',
        a: 'Most cleaning professionals bring their own supplies. Confirm this when booking if you have specific product preferences.',
      },
      {
        q: 'How long does a home cleaning take?',
        a: 'Time depends on the size of your home and the type of cleaning. A standard 2BHK regular clean typically takes 2–3 hours; deep cleaning takes longer.',
      },
    ],
    related: ['electrician', 'plumber', 'carpenter'],
    serviceSchema: 'HomeAndConstructionBusiness',
  },

  carpenter: {
    name: 'Carpentry Services',
    shortName: 'Carpenter',
    title: 'Carpenter in Hyderabad – Furniture Repair & Carpentry Work | ServeGo24',
    description:
      'Book carpentry help in Hyderabad for furniture repairs, fittings, shelves, doors and other household carpentry work. ServeGo24 connects you with verified local carpenters.',
    h1: 'Carpentry Services in Hyderabad',
    intro:
      'Request help for practical carpentry work around the home — furniture repairs, fittings and small installations. Add photos or clear measurements where useful so the requirement is easier to understand.',
    problems: [
      'Furniture repair and adjustment',
      'Shelf, bracket and wall fitting work',
      'Door, hinge and cabinet issues',
      'Bed frame and wardrobe repairs',
      'Small household carpentry installations',
      'Window frame and door lock repairs',
    ],
    faqs: [
      {
        q: 'Can a carpenter fix a broken wardrobe door in Hyderabad?',
        a: 'Yes. Wardrobe door repairs, hinge replacements and sliding door adjustments are common carpentry requests on ServeGo24.',
      },
      {
        q: 'Do I need to arrange materials for carpentry work?',
        a: 'For minor repairs the carpenter may carry basic hardware. For larger jobs like new shelves or custom fittings, discuss material requirements before the visit.',
      },
    ],
    related: ['electrician', 'home-cleaning', 'cctv-installation'],
    serviceSchema: 'HomeAndConstructionBusiness',
  },

  'cctv-installation': {
    name: 'CCTV Installation & Repair',
    shortName: 'CCTV Installation',
    title: 'CCTV Installation in Hyderabad – Home Security Setup | ServeGo24',
    description:
      'Book CCTV installation and repair in Hyderabad for homes and small offices. ServeGo24 connects you with verified CCTV technicians for camera setup, cabling and troubleshooting.',
    h1: 'CCTV Installation in Hyderabad',
    intro:
      'Plan a CCTV setup around the areas you want to monitor, then request installation or repair support. The final equipment and installation requirements depend on the property and system selected.',
    problems: [
      'New CCTV camera installation planning',
      'Camera angle and mounting support',
      'Cabling and DVR/NVR connectivity',
      'Existing CCTV system troubleshooting',
      'Camera not recording or showing black screen',
      'Remote viewing setup on mobile',
    ],
    faqs: [
      {
        q: 'How many cameras do I need for a 2BHK flat in Hyderabad?',
        a: 'Most 2BHK flats use 2–4 cameras covering the main door, parking area and common areas. The exact number depends on your layout and security requirements.',
      },
      {
        q: 'Can ServeGo24 help with CCTV repair if my camera stops working?',
        a: 'Yes. You can request CCTV repair for issues like camera not recording, black screen, connectivity problems and DVR/NVR faults.',
      },
      {
        q: 'Do I need to buy the cameras before booking installation?',
        a: 'You can either purchase cameras yourself or ask the technician to recommend suitable options for your property during the visit.',
      },
    ],
    related: ['electrician', 'carpenter', 'plumber'],
    serviceSchema: 'ElectricalContractor',
  },

  painter: {
    name: 'Painting Services',
    shortName: 'Painter',
    title: 'Painter in Hyderabad – Home & Wall Painting Services | ServeGo24',
    description:
      'Book a painter in Hyderabad for interior and exterior wall painting, touch-up work and home renovation painting. ServeGo24 connects you with verified local painters.',
    h1: 'Painting Services in Hyderabad',
    intro:
      'Request painting help for your home — from a single room touch-up to a full interior repaint. Describe the area, surface type and preferred finish so the painter can give you an accurate assessment.',
    problems: [
      'Interior wall and ceiling painting',
      'Exterior wall painting',
      'Touch-up and patch painting',
      'Texture and decorative finishes',
      'Waterproofing paint application',
      'Wood and metal surface painting',
    ],
    faqs: [
      {
        q: 'How long does it take to paint a 2BHK flat in Hyderabad?',
        a: 'A standard 2BHK interior paint job typically takes 3–5 days depending on the number of coats, surface preparation required and the size of the team.',
      },
      {
        q: 'Do I need to arrange paint and materials?',
        a: 'You can either arrange paint yourself or ask the painter to source it. Discuss brand, finish and quantity requirements before the work begins.',
      },
      {
        q: 'What is the cost of painting a room in Hyderabad?',
        a: 'Painting costs depend on the area in square feet, number of coats, paint quality and surface preparation needed. Get a clear estimate before confirming.',
      },
    ],
    related: ['carpenter', 'home-cleaning', 'electrician'],
    serviceSchema: 'HousePainter',
  },

  'appliance-repair': {
    name: 'Appliance Repair',
    shortName: 'Appliance Repair',
    title: 'Appliance Repair in Hyderabad – Fridge, Washing Machine, TV | ServeGo24',
    description:
      'Book appliance repair in Hyderabad for refrigerators, washing machines, TVs, microwaves and other home appliances. ServeGo24 connects you with verified appliance technicians.',
    h1: 'Appliance Repair Services in Hyderabad',
    intro:
      'When a home appliance stops working, a qualified technician can diagnose and repair the fault. Use ServeGo24 to describe the problem and request appliance repair in Hyderabad.',
    problems: [
      'Refrigerator not cooling or making noise',
      'Washing machine not spinning or draining',
      'TV display or sound issues',
      'Microwave not heating',
      'Dishwasher not working',
      'Water purifier / RO not dispensing water',
    ],
    faqs: [
      {
        q: 'Can ServeGo24 help repair a refrigerator that is not cooling?',
        a: 'Yes. Refrigerator repair is one of the most common appliance requests. A technician will inspect the compressor, thermostat, gas level and other components to identify the fault.',
      },
      {
        q: 'What washing machine problems can be repaired?',
        a: 'Common issues include the machine not spinning, not draining, making loud noise, door not locking and error codes. Mention the brand and model when booking.',
      },
      {
        q: 'Is it worth repairing an old appliance?',
        a: 'A technician can assess whether repair is cost-effective compared to replacement. For appliances under 5–7 years old, repair is usually the better option.',
      },
    ],
    related: ['electrician', 'ac-repair', 'plumber'],
    serviceSchema: 'HomeAndConstructionBusiness',
  },

  'ro-service': {
    name: 'RO & Water Purifier Service',
    shortName: 'RO Service',
    title: 'RO Service & Water Purifier Repair in Hyderabad | ServeGo24',
    description:
      'Book RO service and water purifier repair in Hyderabad for filter replacement, low water flow, bad taste and other issues. ServeGo24 connects you with verified RO technicians.',
    h1: 'RO & Water Purifier Service in Hyderabad',
    intro:
      'Regular RO servicing keeps your water purifier working efficiently and ensures clean drinking water. Request filter replacement, repair or annual maintenance through ServeGo24.',
    problems: [
      'RO not dispensing water or very slow flow',
      'Bad taste or smell in purified water',
      'Water purifier leaking',
      'Filter replacement and annual service',
      'TDS level check and membrane replacement',
      'UV lamp replacement',
    ],
    faqs: [
      {
        q: 'How often should an RO water purifier be serviced?',
        a: 'Most RO systems need servicing every 6–12 months depending on water quality and usage. Pre-filters typically need replacement every 3–6 months.',
      },
      {
        q: 'Why is my RO producing very little water?',
        a: 'Low water output is usually caused by a clogged pre-filter, a worn membrane or low inlet water pressure. A technician can diagnose and fix the issue.',
      },
      {
        q: 'Can ServeGo24 service all RO brands?',
        a: 'Technicians on ServeGo24 can service most common RO brands. Mention your brand and model when booking.',
      },
    ],
    related: ['plumber', 'appliance-repair', 'electrician'],
    serviceSchema: 'HomeAndConstructionBusiness',
  },
};

export const SEO_CITY_PAGE = {
  name: 'Hyderabad',
  slug: 'hyderabad',
  title: 'Home Services in Hyderabad – Book Local Professionals | ServeGo24',
  description:
    'Book verified electricians, plumbers, AC technicians, cleaners, carpenters and other home service professionals in Hyderabad through ServeGo24.',
  h1: 'Home Services in Hyderabad',
  intro:
    'ServeGo24 connects Hyderabad households with verified local professionals for electrical work, plumbing, AC repair, cleaning, carpentry and more. Describe your requirement, share your location and get connected with available professionals in your area.',
  areas: [
    'Gachibowli',
    'Madhapur',
    'Jubilee Hills',
    'Banjara Hills',
    'Kondapur',
    'Kukatpally',
    'Begumpet',
    'Secunderabad',
    'Hitech City',
    'Miyapur',
    'Ameerpet',
    'Dilsukhnagar',
  ],
  faqs: [
    {
      q: 'Which home services are available in Hyderabad through ServeGo24?',
      a: 'ServeGo24 currently offers electrician, plumbing, AC repair and service, home cleaning, carpentry, painting, CCTV installation, appliance repair and RO service in Hyderabad.',
    },
    {
      q: 'How do I book a home service in Hyderabad?',
      a: 'Browse the service you need, click Book Now, share your address and contact details, and confirm. ServeGo24 will connect you with an available professional in your area.',
    },
    {
      q: 'Are the service professionals in Hyderabad verified?',
      a: 'All professionals on ServeGo24 go through an identity and skills verification process before they are approved to take bookings.',
    },
    {
      q: 'Which areas in Hyderabad does ServeGo24 cover?',
      a: 'ServeGo24 covers most areas in Hyderabad including Gachibowli, Madhapur, Jubilee Hills, Banjara Hills, Kondapur, Kukatpally, Begumpet, Secunderabad, Hitech City, Miyapur, Ameerpet and Dilsukhnagar. Coverage may vary by service category.',
    },
  ],
};

// Problem pages are intentionally limited to intents with a clear diagnosis,
// useful self-checks and a natural handoff to a bookable service.
export const SEO_INTENT_PAGES = {
  'electrical-fault': {
    serviceSlug: 'electrician',
    title: 'Electrical Fault in Hyderabad? Find an Electrician | ServeGo24',
    description: 'Learn what to check when a home electrical fault occurs, when to stop troubleshooting, and how to request an electrician in Hyderabad.',
    h1: 'Electrical Fault at Home? Get the Right Help',
    intro: 'A tripping breaker, dead room or burning smell can have different causes. Use these checks to describe the problem safely, then request an electrician when the fault needs professional diagnosis.',
    symptoms: ['One room has no power', 'MCB trips repeatedly', 'Lights flicker or dim', 'A socket feels hot or smells burnt'],
    whatToDo: ['Switch off the affected appliance and avoid repeatedly resetting a tripping breaker.', 'If there is smoke, sparking or a burning smell, switch off power at the main isolator only if it is safe to do so.', 'Do not open the distribution board or touch exposed wiring.'],
    whenToBook: 'Request an electrician when the fault returns after a safe reset, affects fixed wiring, or involves heat, sparking, exposed conductors or water near electrical points.',
    faqs: [
      { q: 'Is it safe to keep resetting an MCB that trips?', a: 'No. Repeated tripping can indicate an overloaded circuit, short circuit, faulty appliance or wiring problem. Switch off the affected circuit and arrange professional diagnosis.' },
      { q: 'What should I include in an electrical fault request?', a: 'Mention the affected room, what stopped working, whether the MCB trips, any smell or sound, and whether the problem started after an appliance was connected.' },
    ],
  },
  'emergency-electrician': {
    serviceSlug: 'electrician',
    title: 'Emergency Electrician in Hyderabad | ServeGo24',
    description: 'Need urgent electrical help in Hyderabad? Learn what to do first and request an electrician for dangerous or disruptive home electrical faults.',
    h1: 'Emergency Electrician Help in Hyderabad',
    intro: 'Electrical emergencies need caution before speed. Isolate the danger if you can do so safely, keep people away from the area, and describe the fault clearly when requesting help.',
    symptoms: ['Sparking socket or switch', 'Burning smell from a panel or appliance', 'Power keeps tripping', 'Exposed or damaged wire'],
    whatToDo: ['Keep children and pets away from the affected area.', 'Do not touch wet switches, fallen wires or damaged equipment.', 'Call emergency services if there is fire or immediate danger, then use ServeGo24 for repair support when the area is safe.'],
    whenToBook: 'Use this route for urgent household electrical faults that need an electrician quickly. Availability depends on the location, time and active professionals nearby.',
    faqs: [
      { q: 'Does ServeGo24 guarantee immediate emergency arrival?', a: 'No. Response time depends on current availability and location. Submit the details and ServeGo24 will notify available professionals.' },
      { q: 'Should I repair a sparking socket myself?', a: 'No. Switch off power only if safe, keep clear of the area and arrange professional inspection.' },
    ],
  },
  'tap-leaking': {
    serviceSlug: 'plumber',
    title: 'Tap Leaking in Hyderabad? Book a Plumber | ServeGo24',
    description: 'Find practical steps for a leaking tap and request a plumber in Hyderabad for washers, cartridges, valves, fittings or pipe connections.',
    h1: 'Leaking Tap? Find the Cause Before It Gets Worse',
    intro: 'A dripping outlet may need a small washer or cartridge, while water around the base or wall can indicate a connection or pipe issue. Identify where the water starts before booking a plumber.',
    symptoms: ['Water drips from the spout after closing', 'Leak comes from the tap handle or base', 'Water appears below the sink', 'The wall connection is wet'],
    whatToDo: ['Close the local isolation valve if one is available.', 'Dry the area and check whether the leak is from the outlet, handle, flexible hose or wall connection.', 'Do not overtighten fittings, as this can damage threads or seals.'],
    whenToBook: 'Request a plumber if the isolation valve does not stop the leak, water is entering a cabinet or wall, or a replacement fitting is needed.',
    faqs: [
      { q: 'Can a leaking tap be repaired without replacing the whole tap?', a: 'Often yes. A plumber can inspect the washer, cartridge, O-ring or connection and recommend replacement only when the fitting is worn or damaged.' },
      { q: 'What details help a plumber prepare?', a: 'Share the fixture type, leak location, whether the water can be isolated, and a photo if the platform allows it.' },
    ],
  },
  'drain-blockage': {
    serviceSlug: 'plumber',
    title: 'Drain Blockage in Hyderabad | Book Plumbing Help | ServeGo24',
    description: 'Learn what to check for a blocked sink, floor drain or bathroom outlet, and request a plumber in Hyderabad when home fixes do not work.',
    h1: 'Blocked Drain? Get Plumbing Help in Hyderabad',
    intro: 'Slow drainage often starts with a local buildup, but recurring blockage or backflow can point to a deeper pipe problem. Use simple checks first and avoid damaging the pipe with harsh chemicals.',
    symptoms: ['Sink drains slowly', 'Bathroom water pools on the floor', 'Bad smell comes from the drain', 'Water backs up when another fixture runs'],
    whatToDo: ['Remove visible hair, food or debris from the drain cover.', 'Try a plunger with enough water to form a seal.', 'Avoid mixing chemical drain cleaners or using them near other household chemicals.'],
    whenToBook: 'Request a plumber when the blockage returns, affects multiple fixtures, causes backflow or cannot be cleared safely with a plunger.',
    faqs: [
      { q: 'Why does a drain keep blocking after cleaning?', a: 'The restriction may be deeper in the pipe, the pipe may have a poor slope, or buildup may remain beyond the trap. A plumber can inspect the cause.' },
      { q: 'Can I use strong acid to clear a drain?', a: 'It is safer to avoid mixing or pouring harsh chemicals. They can damage fittings and create a hazard for anyone who later opens the pipe.' },
    ],
  },
  'emergency-plumber': {
    serviceSlug: 'plumber',
    title: 'Emergency Plumber in Hyderabad | ServeGo24',
    description: 'Need urgent plumbing help in Hyderabad? Learn what to do for active leaks, overflowing fixtures and water damage before requesting a plumber.',
    h1: 'Emergency Plumbing Help in Hyderabad',
    intro: 'Stop the water source first when possible. A fast, accurate request helps a plumber understand whether the job involves an isolation valve, fixture, pipe or drain.',
    symptoms: ['Pipe has burst or is spraying water', 'Toilet or drain is overflowing', 'Water is spreading under a sink', 'Ceiling or wall shows active water damage'],
    whatToDo: ['Close the nearest isolation valve or the main water supply if it is safe.', 'Move electrical items away from wet areas without touching wet electrical equipment.', 'Take a photo from a safe distance and describe where the water started.'],
    whenToBook: 'Request urgent plumbing help when water cannot be isolated, is damaging the property, or affects a bathroom, kitchen or shared building area.',
    faqs: [
      { q: 'Can ServeGo24 guarantee a plumber at any hour?', a: 'No. Availability varies by area and time. The request is shared with available professionals so you can see who can respond.' },
      { q: 'What should I do if water is near an electrical point?', a: 'Keep away from the area and do not touch wet switches or appliances. Isolate power only from a dry, safe location and seek urgent professional help.' },
    ],
  },
  'ac-not-cooling': {
    serviceSlug: 'ac-repair',
    title: 'AC Not Cooling in Hyderabad? Book AC Repair | ServeGo24',
    description: 'Find safe checks for an AC that is not cooling and request a technician in Hyderabad for airflow, refrigerant, electrical or component diagnosis.',
    h1: 'AC Not Cooling? Start With These Checks',
    intro: 'Poor cooling can come from a dirty filter, blocked airflow, outdoor-unit conditions, refrigerant loss or a component fault. A few safe checks can make the service request more useful.',
    symptoms: ['Airflow is weak', 'The room stays warm despite long operation', 'Outdoor unit runs but cooling is poor', 'The AC freezes, leaks or trips power'],
    whatToDo: ['Clean or replace accessible filters according to the manufacturer instructions.', 'Check that doors, windows and the outdoor-unit airflow path are not blocked.', 'Do not open the refrigerant circuit or attempt a gas refill yourself.'],
    whenToBook: 'Request AC repair when cooling remains poor after filter and airflow checks, or when the unit leaks, freezes, makes unusual noise or trips power.',
    faqs: [
      { q: 'Does low refrigerant always mean the AC needs a gas refill?', a: 'Not necessarily. Refrigerant loss can indicate a leak, so the technician should inspect and diagnose the cause before charging the system.' },
      { q: 'What information should I send with an AC repair request?', a: 'Include split or window type, brand and model if known, the last service date, room size, and whether the issue is weak airflow, leakage, noise or power related.' },
    ],
  },
  'ac-water-leakage': {
    serviceSlug: 'ac-repair',
    title: 'AC Water Leakage in Hyderabad | Book AC Service | ServeGo24',
    description: 'Learn why an indoor AC may leak water and when to request a Hyderabad AC technician for drainage, installation or cooling-related faults.',
    h1: 'AC Water Leakage? Protect the Wall and Floor',
    intro: 'Indoor-unit water leakage can come from a blocked drain, dirty filter, frozen coil, poor installation slope or a damaged drain hose. Stop using the unit if water is reaching electrical points.',
    symptoms: ['Water drips from the indoor unit', 'The drain pipe does not discharge water', 'Ice forms before the leak', 'Leak appears after installation or servicing'],
    whatToDo: ['Switch the AC off and place a container below the drip if safe.', 'Keep furniture and electrical equipment away from the water.', 'Do not push tools into the drain hose or open the indoor unit without training.'],
    whenToBook: 'Request AC service when the leak returns, the drain line is blocked, ice forms, or the indoor unit is not level.',
    faqs: [
      { q: 'Can a dirty filter cause AC water leakage?', a: 'Yes. Restricted airflow can cause the coil to freeze and later release excess water, although the underlying cause should still be checked.' },
      { q: 'Should I keep running a leaking AC?', a: 'It is better to switch it off until the source is checked, especially when water is near wiring, sockets or valuable equipment.' },
    ],
  },
  'ac-unusual-noise': {
    serviceSlug: 'ac-repair',
    title: 'AC Making Unusual Noise in Hyderabad | ServeGo24',
    description: 'Find likely causes of AC rattling, buzzing or grinding sounds and request a technician in Hyderabad for inspection and repair.',
    h1: 'AC Making an Unusual Noise?',
    intro: 'The sound can help describe the fault: a rattle may involve a loose panel, while grinding, buzzing or repeated clicking can need a technician. Turn the unit off if the noise is sudden or severe.',
    symptoms: ['Rattling or vibration', 'Grinding or squealing', 'Buzzing or repeated clicking', 'Outdoor unit sounds louder than usual'],
    whatToDo: ['Note whether the sound comes from the indoor or outdoor unit and whether it changes with fan speed.', 'Check only for loose objects around the unit from a safe position.', 'Stop the AC if there is burning smell, smoke or a sharp mechanical sound.'],
    whenToBook: 'Request AC repair when unusual noise persists, cooling changes, vibration increases or the unit shows any electrical warning signs.',
    faqs: [
      { q: 'Can a noisy AC be fixed with cleaning alone?', a: 'Sometimes dust or a loose panel is the cause, but fan, motor, bearing and mounting faults need inspection. A technician should diagnose the sound.' },
      { q: 'Is buzzing from an AC dangerous?', a: 'It can indicate an electrical or component issue. Switch the unit off if the sound is new, loud or accompanied by heat or smell, and arrange inspection.' },
    ],
  },
  'ac-maintenance': {
    serviceSlug: 'ac-repair',
    title: 'AC Maintenance in Hyderabad | Book Preventive Service | ServeGo24',
    description: 'Understand what routine AC maintenance covers and request preventive AC service in Hyderabad before cooling problems become urgent repairs.',
    h1: 'AC Maintenance Before Cooling Problems Start',
    intro: 'Preventive service is useful when filters soil quickly, airflow drops, the unit runs longer than usual or cooling changes before summer demand rises. The technician should inspect the system rather than sell an automatic refill.',
    symptoms: ['Cooling has gradually reduced', 'Airflow is weaker than before', 'The unit runs for longer cycles', 'The AC has not been serviced recently'],
    whatToDo: ['Clean accessible filters regularly as recommended for your model.', 'Keep the indoor and outdoor airflow paths clear.', 'Record the model, last service and any noise, smell, leak or power symptoms.'],
    whenToBook: 'Schedule maintenance before peak summer use or when performance changes, and request diagnosis if maintenance does not restore cooling.',
    faqs: [
      { q: 'How often should an AC be serviced?', a: 'Frequency depends on usage, dust, environment and the manufacturer guidance. Many homes schedule a detailed service before heavy summer use and clean filters more often.' },
      { q: 'Does every AC service include gas charging?', a: 'No. Refrigerant should be checked and charged only when diagnosis supports it. Ask the technician to explain the cause and work proposed.' },
    ],
  },
};

export function getServiceLanding(slug) {
  return SEO_SERVICE_PAGES[slug] || null;
}

export function getIntentLanding(slug) {
  return SEO_INTENT_PAGES[slug] || null;
}

// All service slugs in display order — used for sitemaps and navigation.
export const SERVICE_SLUGS = Object.keys(SEO_SERVICE_PAGES);
