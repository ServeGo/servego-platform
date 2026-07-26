import prisma from '../prisma/client.js';

const SERVICES = [
  { id: 'electrician', name: 'Electrician', description: 'Certified electricians for wiring, fixtures, switchboards, and power failures.', popularIssues: ['Short circuit fixing', 'Fan installation', 'Switchboard repair', 'Complete home rewiring', 'Inverter setup'] },
  { id: 'plumber', name: 'Plumber', description: 'Expert plumbing for leakages, pipe blockages, taps, basin installs, and pumps.', popularIssues: ['Tap leakage repair', 'Drain blockage removal', 'Water meter install', 'Bathroom fittings', 'Water tank repair'] },
  { id: 'ac-repair', name: 'AC Repair', description: 'Deep AC filter clean, gas charging, cooling restoration, and system installations.', popularIssues: ['AC deep servicing', 'Gas leakage refill', 'Cooling troubleshooting', 'AC uninstallation', 'Noise correction'] },
  { id: 'home-cleaning', name: 'Home Cleaning', description: 'Dusting, mopping, bathroom scrubbing, kitchen cleaning & trash handling.', popularIssues: ['Regular 2BHK cleaning', 'Regular 3BHK cleaning', 'Kitchen deep scrubbing', 'Bathroom disinfection'] },
  { id: 'deep-cleaning', name: 'Deep Cleaning', description: 'Thorough sanitation, steam vacuuming, hard water stain removal, and sofa shampooing.', popularIssues: ['Full villa deep cleaning', 'Sofa & carpet shampoo', 'Balcony pressure wash', 'Move-out thorough cleaning'] },
  { id: 'painting', name: 'Painting', description: 'Premium wall texture, wall putty, interior/exterior painting with free masking service.', popularIssues: ['Single accent wall design', 'Full apartment painting', 'Waterproofing & crack filling', 'Wall stencil art'] },
  { id: 'appliance-repair', name: 'Appliance Repair', description: 'Quick diagnostics and genuine spare parts for washing machines, TVs, and refrigerators.', popularIssues: ['Washing machine spin issue', 'Refrigerator not-cooling', 'Microwave oven repair', 'Chimney filter cleanup'] },
  { id: 'carpentry', name: 'Carpentry', description: 'Woodwork repairs, hinge replacement, custom wardrobe design, and alignment fixes.', popularIssues: ['Door hinge replacement', 'Wardrobe latch repair', 'Custom shelves installation', 'Bed assembly / alignment'] },
  { id: 'home-maintenance', name: 'Home Maintenance', description: 'General handyman tasks, wall mounting, lock replacements, and minor repairs.', popularIssues: ['TV wall mounting', 'Curtain rod installation', 'Door lock replacement', 'Mirror / painting hanging'] },
  { id: 'pest-control', name: 'Pest Control', description: 'Professional pest extermination for termites, cockroaches, rodents, and mosquitoes.', popularIssues: ['Cockroach gel treatment', 'Termite wood treatment', 'Mosquito fogging', 'Rat rodent removal'] },
  { id: 'salon-at-home', name: 'Salon at Home', description: 'Professional grooming, hair styling, facials, and waxing services at your doorstep.', popularIssues: ['Haircut & styling', 'Bridal makeup', 'Full body wax', 'Men grooming套餐'] },
  { id: 'sofa-cleaning', name: 'Sofa Cleaning', description: 'Steam extraction and shampooing for fabric, leather, and suede sofas and recliners.', popularIssues: ['Fabric sofa shampoo', 'Leather sofa conditioning', 'Stain removal', 'Odor treatment'] },
  { id: 'water-tank-cleaning', name: 'Water Tank Cleaning', description: 'Overhead and underground water tank sanitization, sludge removal, and disinfection.', popularIssues: ['Overhead tank cleaning', 'Underground sump cleaning', 'Sludge jet wash', 'Chlorination treatment'] },
  { id: 'electrical-appliance-installation', name: 'Appliance Installation', description: 'Expert installation of fans, geysers, chimneys, RO purifiers, and wash basins.', popularIssues: ['Ceiling fan install', 'Geyser wall mount', 'RO purifier setup', 'Chimney hood install'] },
  { id: 'modular-kitchen', name: 'Modular Kitchen', description: 'Custom modular kitchen design, fabrication, installation, and after-sales service.', popularIssues: ['L-shaped kitchen setup', 'Island counter install', 'Soft-close drawer fitting', 'Chimney & hob combo'] },
  { id: 'interior-design', name: 'Interior Design', description: 'Complete home and office interior design consultations, 3D renders, and execution.', popularIssues: ['Living room redesign', 'Bedroom modular wardrobe', 'False ceiling work', 'Compact study room'] },
  { id: 'packers-movers', name: 'Packers & Movers', description: 'Verified local and intercity relocation with packing, loading, transport, and unpacking.', popularIssues: ['1BHK local shifting', '3BHK intercity move', 'Office relocation', 'Single item transport'] },
  { id: 'cctv-installation', name: 'CCTV Installation', description: 'CCTV camera setup, DVR/NVR wiring, remote viewing configuration, and annual AMC.', popularIssues: ['4-camera wired setup', 'Wi-Fi camera install', 'Night vision upgrade', 'NVR system config'] },
  { id: 'geyser-water-heater', name: 'Geyser & Water Heater', description: 'Installation, repair, and maintenance for electric, gas, and solar water heaters.', popularIssues: ['Geyser not heating', 'Thermostat replacement', 'Annual descaling', 'Solar heater setup'] },
  { id: 'tile-grouting', name: 'Tile & Grouting', description: 'Tile replacement, re-grouting, waterproofing, and anti-skid floor treatments.', popularIssues: ['Bathroom re-grouting', 'Cracked tile replacement', 'Floor waterproofing', 'Anti-skid treatment'] },
];

export async function seedServicesIfEmpty() {
  const existing = await prisma.service.findMany();
  if (existing.length > 0) return;

  for (const svc of SERVICES) {
    const nameNormalized = svc.name.toLowerCase().trim();
    await prisma.service.create({
      data: {
        id: svc.id,
        name: svc.name,
        nameNormalized,
        description: svc.description,
        popularIssues: svc.popularIssues || [],
      },
    });
  }

  console.log(`✅ Seeded ${SERVICES.length} services`);
}
