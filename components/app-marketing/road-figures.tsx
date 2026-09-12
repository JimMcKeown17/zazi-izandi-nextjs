"use client";

import { useEffect } from "react";
import { SurveyRoadSvg, LoopRoadSvg } from "./road-svgs";

/* The two animated figures are SMIL-driven SVGs, so reduced-motion is handled
   in script: pause the timeline and park each figure on a readable frame. */
export function RoadFigures() {
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.querySelectorAll<SVGSVGElement>("svg.road").forEach((svg) => {
      svg.pauseAnimations();
      svg.setCurrentTime(parseFloat(svg.dataset.still ?? "2"));
    });
  }, []);

  return (
    <div className="roads">
      <figure className="roadfig">
        <SurveyRoadSvg />
        <ul className="rb cold">
          <li>Carries <strong>EA work</strong> out - which sessions happened.</li>
          <li>Drops it on somebody else’s servers.</li>
          <li>Nothing comes back to the classroom.</li>
          <li>The lanes are fixed. We can’t add one.</li>
        </ul>
      </figure>
      <figure className="roadfig">
        <LoopRoadSvg />
        <ul className="rb warm">
          <li>Carries <strong>EA work</strong> and each <strong>child’s level</strong> - the letters they can read.</li>
          <li>Masi’s AI reads it: every child, every group, every day.</li>
          <li>Sends back <strong>intelligence, advice, corrections and nudges</strong> to the EA’s phone.</li>
          <li>We own the road, so a new lane is added whenever we need one.</li>
        </ul>
      </figure>
    </div>
  );
}
