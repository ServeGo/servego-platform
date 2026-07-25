import prisma from '../prisma/client.js';

function decodeHtmlEntities(str) {
  if (!str) return str;
  return str
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x22;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#x26;/g, '&')
    .replace(/&#38;/g, '&')
    .replace(/&#x3C;/g, '<')
    .replace(/&#60;/g, '<')
    .replace(/&#x3E;/g, '>')
    .replace(/&#62;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function main() {
  const [requests, services] = await Promise.all([
    prisma.providerServiceRequest.findMany({ where: { description: { contains: '&#' } } }),
    prisma.providerService.findMany({ where: { description: { contains: '&#' } } })
  ]);

  let fixed = 0;

  for (const r of requests) {
    const decoded = decodeHtmlEntities(r.description);
    if (decoded !== r.description) {
      await prisma.providerServiceRequest.update({ where: { id: r.id }, data: { description: decoded } });
      console.log(`Fixed ProviderServiceRequest ${r.id}: "${r.description}" -> "${decoded}"`);
      fixed++;
    }
  }

  for (const s of services) {
    const decoded = decodeHtmlEntities(s.description);
    if (decoded !== s.description) {
      await prisma.providerService.update({ where: { id: s.id }, data: { description: decoded } });
      console.log(`Fixed ProviderService ${s.id}: "${s.description}" -> "${decoded}"`);
      fixed++;
    }
  }

  console.log(`Done. Fixed ${fixed} descriptions.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
