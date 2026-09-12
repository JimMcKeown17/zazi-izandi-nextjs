import Image from "next/image";

type Shot = { src: string; alt: string; width: number; height: number; title: string; blurb: string };

const LEAD: Shot = {
  src: "/images/mobile-app/programme-dashboard.png", alt: "Live programme dashboard", width: 1400, height: 575,
  title: "Live programme dashboard",
  blurb: "Schools, children, sessions and dosage for the whole programme, updated every night. One screen answers “how are we doing?” for staff and funders alike.",
};

const SHOTS: Shot[] = [
  { src: "/images/mobile-app/ea-performance-map.png", alt: "EA performance map", width: 1400, height: 741,
    title: "EA performance map",
    blurb: "Every EA plotted by sessions run and letter progress, so support goes to the people who need it." },
  { src: "/images/mobile-app/quality-flags.png", alt: "Quality flags", width: 1400, height: 700,
    title: "Quality flags",
    blurb: "Groups stuck on the same letters, moving too fast, or skipped for days are flagged automatically." },
  { src: "/images/mobile-app/session-tracking.png", alt: "Session tracking", width: 1400, height: 878,
    title: "Session tracking",
    blurb: "Daily session trend, and an activity heatmap for every EA over the last ten working days." },
];

function Window({ shot, sizes }: { shot: Shot; sizes: string }) {
  return (
    <div className="win">
      <div className="winbar"><i /><i /><i /></div>
      <Image src={shot.src} alt={shot.alt} width={shot.width} height={shot.height} sizes={sizes} />
    </div>
  );
}

export function PlatformSection() {
  return (
    <section>
      <div className="wrap">
        <p className="eyebrow">Platform</p>
        <h2>The Masi website - what the team sees</h2>
        <p className="lede">
          Everything the app collects lands on one website for the Masi team, refreshed every
          night and filterable by school, EA and group.
        </p>
        <div className="plead">
          <Window shot={LEAD} sizes="(max-width: 820px) 100vw, 560px" />
          <div className="pleadtxt">
            <h3>{LEAD.title}</h3>
            <p>{LEAD.blurb}</p>
            <ul className="rb warm">
              <li>Filter by school, EA or group.</li>
              <li>Dosage and on-track targets per group.</li>
              <li>Active quality flags, ready to act on.</li>
            </ul>
          </div>
        </div>
        <div className="pgrid">
          {SHOTS.map((s) => (
            <div className="pcard2" key={s.src}>
              <Window shot={s} sizes="(max-width: 820px) 100vw, 320px" />
              <h4>{s.title}</h4>
              <p>{s.blurb}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
