import Image from "next/image";

const partners = [
  {
    name: "Masinyusane",
    src: "/images/sponsors/Masi Logo.png",
    width: 160,
  },
  {
    name: "TLT",
    src: "/images/sponsors/TLT logo.png",
    width: 120,
  },
  {
    name: "Department of Education Eastern Cape",
    src: "/images/sponsors/DoE EC Logo.png",
    width: 140,
  },
  {
    name: "DGMT",
    src: "/images/sponsors/dgmt-orange.png",
    width: 120,
  },
  {
    name: "Funda Wande",
    src: "/images/sponsors/Funda Wande Logo-t.png",
    width: 160,
  },
  {
    name: "Gates Foundation",
    src: "/images/sponsors/gates-foundation-logo-t74.png",
    width: 140,
  },
  {
    name: "Click Learning",
    src: "/images/sponsors/click-logo.gif",
    width: 120,
  },
  {
    name: "BLC",
    src: "/images/sponsors/bcl-logo.jpeg",
    width: 120,
  },
  {
    name: "Allan Gray Foundation",
    src: "/images/sponsors/allan-gray-foundation.png",
    width: 160,
  },
  {
    name: "Teampact",
    src: "/images/sponsors/teampact-logo.png",
    width: 140,
  },
];

export default function PartnersSection() {
  return (
    <section className="py-14 bg-gray-50 border-t border-gray-100">
      <div className="container">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 mb-10">
          Partners & Supporters
        </p>
        <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16">
          {partners.map((partner) => (
            <div
              key={partner.name}
              className="grayscale hover:grayscale-0 transition-all duration-300 opacity-60 hover:opacity-100"
            >
              <Image
                src={partner.src}
                alt={partner.name}
                width={partner.width}
                height={60}
                className="object-contain h-12 w-auto"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
