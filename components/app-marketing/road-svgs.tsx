/* Inline SVG illustrations for the road metaphor. Animation is SMIL
   (animateMotion / animate / animateTransform), no library. Both figures share
   one 9s clock in the loop figure so truck, factory lights and sparkles stay in
   sync. Ported verbatim from the approved artifact; keep edits in sync there. */

export function SurveyRoadSvg() {
  return (
    <svg viewBox="0 30 600 300" role="img" className="road" data-still="2.4"
               aria-label="A generic survey app: a small truck carries one crate of EA work along a one-way road from the classroom to a locked grey warehouse. Nothing comes back.">
            <defs>
              <linearGradient id="skyA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#F4F2EC"/><stop offset="1" stopColor="#FFFFFF" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="600" height="200" fill="url(#skyA)"/>
            <line x1="24" y1="212" x2="576" y2="212" stroke="#E4DFD3" strokeWidth="1.5"/>
            <path d="M118 160 H482" stroke="#242D45" strokeWidth="46" fill="none"/>
            <path d="M118 160 H482" stroke="#39445F" strokeWidth="38" fill="none"/>
            <path d="M130 160 H470" stroke="#F7F4EC" strokeWidth="2" strokeDasharray="18 14" fill="none" opacity=".5"/>
            <g fill="none" stroke="#F7F4EC" strokeWidth="2.5" opacity=".55">
              <path d="M215 148 l8 12 l-8 12"/><path d="M300 148 l8 12 l-8 12"/><path d="M385 148 l8 12 l-8 12"/>
            </g>
            <g className="lbl">
              <rect x="238" y="98" width="124" height="24" rx="12" fill="#FFFFFF" stroke="#E4DFD3"/>
              <text x="300" y="114" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1F2B45">Out: EA work</text>
              <text x="300" y="236" textAnchor="middle" fontSize="12.5" fontStyle="italic" fill="#55617D">nothing comes back</text>
            </g>
            <g opacity="0">
              <animateMotion dur="5.5s" repeatCount="indefinite" calcMode="linear" path="M92 160 H522"/>
              <animate attributeName="opacity" dur="5.5s" repeatCount="indefinite" calcMode="linear"
                       values="0;1;1;0;0" keyTimes="0;0.06;0.9;0.96;1"/>
              <ellipse cx="8" cy="18" rx="60" ry="5" fill="#1F2B45" opacity=".18"/>
              <rect x="-44" y="-6" width="80" height="12" rx="2" fill="#2C3E66"/>
              <rect x="34" y="-24" width="34" height="30" rx="6" fill="#2C3E66"/>
              <rect x="39" y="-19" width="18" height="11" rx="2" fill="#DCE4F5"/>
              <rect x="65" y="-8" width="4" height="6" rx="1" fill="#F0A81A"/>
              <rect x="62" y="2" width="8" height="5" rx="1" fill="#1F2B45"/>
              <g transform="translate(-28,10)"><circle r="8" fill="#1F2B45"/><circle r="3.5" fill="#8A93AC"/>
                <g stroke="#1F2B45" strokeWidth="1.5"><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur=".7s" repeatCount="indefinite"/><path d="M-3.5 0 H3.5 M0 -3.5 V3.5"/></g></g>
              <g transform="translate(50,10)"><circle r="8" fill="#1F2B45"/><circle r="3.5" fill="#8A93AC"/>
                <g stroke="#1F2B45" strokeWidth="1.5"><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur=".7s" repeatCount="indefinite"/><path d="M-3.5 0 H3.5 M0 -3.5 V3.5"/></g></g>
              <rect x="-40" y="-30" width="56" height="24" rx="3" fill="#8A93AC"/>
              <rect x="-40" y="-30" width="56" height="4" rx="2" fill="#A3ABC0"/>
              <text className="lbl" x="-12" y="-13" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#FFFFFF">EA work</text>
            </g>
            <g>
              <ellipse cx="80" cy="214" rx="52" ry="5" fill="#1F2B45" opacity=".12"/>
              <rect x="38" y="118" width="84" height="94" fill="#FFFFFF" stroke="#1F2B45" strokeWidth="2"/>
              <polygon points="28,120 80,84 132,120" fill="#F0A81A" stroke="#1F2B45" strokeWidth="2" strokeLinejoin="round"/>
              <rect x="124" y="92" width="2" height="30" fill="#1F2B45"/><polygon points="126,92 142,97 126,102" fill="#D64545"/>
              <g fill="#E9EEF7" stroke="#1F2B45" strokeWidth="1.5">
                <rect x="48" y="132" width="20" height="18"/><rect x="92" y="132" width="20" height="18"/>
              </g>
              <g stroke="#1F2B45" strokeWidth="1"><path d="M58 132 V150 M48 141 H68 M102 132 V150 M92 141 H112"/></g>
              <rect x="70" y="170" width="20" height="42" fill="#16233E"/>
              <rect x="62" y="206" width="36" height="6" fill="#C9C2B2"/>
              <text x="80" y="236" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1F2B45">Classroom</text>
              <text x="80" y="252" textAnchor="middle" fontSize="11.5" fill="#55617D">EAs and children</text>
            </g>
            <g>
              <ellipse cx="520" cy="214" rx="60" ry="5" fill="#1F2B45" opacity=".12"/>
              <rect x="466" y="112" width="108" height="100" rx="3" fill="#C9C2B2" stroke="#8F877A" strokeWidth="2"/>
              <rect x="466" y="112" width="108" height="16" fill="#8F877A"/>
              <rect x="496" y="146" width="48" height="66" fill="#A39B8C" stroke="#8F877A" strokeWidth="1.5"/>
              <g stroke="#8F877A" strokeWidth="1.5"><path d="M498 156 H542 M498 166 H542 M498 176 H542 M498 186 H542 M498 196 H542"/></g>
              <rect x="512" y="170" width="16" height="13" rx="2" fill="#6F675B"/>
              <path d="M515 170 v-5 a5 5 0 0 1 10 0 v5" fill="none" stroke="#6F675B" strokeWidth="2.5"/>
              <text x="520" y="236" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1F2B45">Their servers</text>
              <text x="520" y="252" textAnchor="middle" fontSize="11.5" fill="#55617D">dashboards only</text>
            </g>
            <text x="300" y="300" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1F2B45">A survey app</text>
            <text x="300" y="318" textAnchor="middle" fontSize="12" fill="#55617D">narrow · one-way · not ours</text>
          </svg>
  );
}

export function LoopRoadSvg() {
  return (
    <svg viewBox="0 30 600 300" role="img" className="road" data-still="5.9"
               aria-label="The ZZ app: a truck leaves the classroom carrying EA work and each child’s level, drives to the Masi AI building where a glowing dome sparks and thinks, and returns on the same loop stacked with intelligence, advice, corrections and nudges.">
            <defs>
              <linearGradient id="skyB" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#FBEED0"/><stop offset="1" stopColor="#FFFFFF" stopOpacity="0"/>
              </linearGradient>
              <radialGradient id="halo" cx=".5" cy=".5" r=".5">
                <stop offset="0" stopColor="#F0A81A" stopOpacity=".95"/>
                <stop offset=".45" stopColor="#F0A81A" stopOpacity=".35"/>
                <stop offset="1" stopColor="#F0A81A" stopOpacity="0"/>
              </radialGradient>
              <radialGradient id="dome" cx=".4" cy=".35" r=".7">
                <stop offset="0" stopColor="#FFF3CF"/><stop offset=".5" stopColor="#F0A81A"/><stop offset="1" stopColor="#C9880D"/>
              </radialGradient>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <path id="spark" d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2 Z"/>
              <path id="orbit" d="M520 86 m-42 0 a42 16 0 1 0 84 0 a42 16 0 1 0 -84 0"/>
            </defs>
            <rect x="0" y="0" width="600" height="200" fill="url(#skyB)"/>
            <line x1="24" y1="212" x2="576" y2="212" stroke="#E4DFD3" strokeWidth="1.5"/>
            <circle cx="520" cy="90" r="70" fill="url(#halo)" opacity=".45">
              <animate attributeName="opacity" dur="9s" repeatCount="indefinite" values=".45;.45;1;1;.45;.45" keyTimes="0;0.34;0.38;0.45;0.5;1"/>
              <animate attributeName="r" dur="9s" repeatCount="indefinite" values="70;70;92;92;70;70" keyTimes="0;0.34;0.38;0.45;0.5;1"/>
            </circle>
            <path d="M130 120 H470 A35 35 0 0 1 470 190 H130 A35 35 0 0 1 130 120 Z" stroke="#242D45" strokeWidth="46" fill="none" strokeLinejoin="round"/>
            <path d="M130 120 H470 A35 35 0 0 1 470 190 H130 A35 35 0 0 1 130 120 Z" stroke="#39445F" strokeWidth="38" fill="none" strokeLinejoin="round"/>
            <path d="M130 120 H470 A35 35 0 0 1 470 190 H130 A35 35 0 0 1 130 120 Z" stroke="#F7F4EC" strokeWidth="2" strokeDasharray="18 14" fill="none" opacity=".3"/>
            <g fill="none" stroke="#F7F4EC" strokeWidth="2.5" opacity=".55">
              <path d="M215 108 l8 12 l-8 12"/><path d="M300 108 l8 12 l-8 12"/><path d="M385 108 l8 12 l-8 12"/>
              <path d="M393 178 l-8 12 l8 12"/><path d="M308 178 l-8 12 l8 12"/><path d="M223 178 l-8 12 l8 12"/>
            </g>
            <g className="lbl">
              <rect x="196" y="60" width="208" height="24" rx="12" fill="#FFFFFF" stroke="#F0A81A" strokeWidth="1.5"/>
              <text x="300" y="76" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1F2B45">Out: EA work <tspan fill="#C9880D" fontWeight="800">+ child’s level</tspan></text>
              <rect x="160" y="228" width="280" height="24" rx="12" fill="#FFFFFF" stroke="#E4DFD3"/>
              <text x="300" y="244" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1F2B45">Back: intelligence · advice · corrections · nudges</text>
            </g>
            <g opacity="0">
              <animateMotion dur="9s" repeatCount="indefinite" calcMode="linear"
                             keyPoints="0;1;1" keyTimes="0;0.356;1"
                             path="M92 120 H470 A35 35 0 0 1 505 155"/>
              <animate attributeName="opacity" dur="9s" repeatCount="indefinite" calcMode="linear"
                       values="0;1;1;0;0" keyTimes="0;0.03;0.33;0.356;1"/>
              <ellipse cx="-14" cy="18" rx="82" ry="5" fill="#1F2B45" opacity=".18"/>
              <rect x="-94" y="-6" width="130" height="12" rx="2" fill="#2C3E66"/>
              <rect x="34" y="-24" width="34" height="30" rx="6" fill="#2C3E66"/>
              <rect x="39" y="-19" width="18" height="11" rx="2" fill="#DCE4F5"/>
              <rect x="65" y="-8" width="4" height="6" rx="1" fill="#F0A81A"/>
              <rect x="62" y="2" width="8" height="5" rx="1" fill="#1F2B45"/>
              <g transform="translate(-76,10)"><circle r="8" fill="#1F2B45"/><circle r="3.5" fill="#8A93AC"/>
                <g stroke="#1F2B45" strokeWidth="1.5"><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur=".7s" repeatCount="indefinite"/><path d="M-3.5 0 H3.5 M0 -3.5 V3.5"/></g></g>
              <g transform="translate(-22,10)"><circle r="8" fill="#1F2B45"/><circle r="3.5" fill="#8A93AC"/>
                <g stroke="#1F2B45" strokeWidth="1.5"><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur=".7s" repeatCount="indefinite"/><path d="M-3.5 0 H3.5 M0 -3.5 V3.5"/></g></g>
              <g transform="translate(50,10)"><circle r="8" fill="#1F2B45"/><circle r="3.5" fill="#8A93AC"/>
                <g stroke="#1F2B45" strokeWidth="1.5"><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur=".7s" repeatCount="indefinite"/><path d="M-3.5 0 H3.5 M0 -3.5 V3.5"/></g></g>
              <rect x="-92" y="-30" width="60" height="24" rx="3" fill="#8A93AC"/><rect x="-92" y="-30" width="60" height="4" rx="2" fill="#A3ABC0"/>
              <text className="lbl" x="-62" y="-13" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#FFFFFF">EA work</text>
              <rect x="-28" y="-30" width="60" height="24" rx="3" fill="#F0A81A"/><rect x="-28" y="-30" width="60" height="4" rx="2" fill="#F6C65A"/>
              <text className="lbl" x="2" y="-13" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#16233E">Child’s level</text>
            </g>
            <g opacity="0">
              <animateMotion dur="9s" repeatCount="indefinite" calcMode="linear"
                             keyPoints="0;0;1;1" keyTimes="0;0.467;0.867;1"
                             path="M505 155 A35 35 0 0 1 470 190 H130 A35 35 0 0 1 95 155"/>
              <animate attributeName="opacity" dur="9s" repeatCount="indefinite" calcMode="linear"
                       values="0;0;1;1;0;0" keyTimes="0;0.467;0.49;0.845;0.867;1"/>
              <ellipse cx="14" cy="18" rx="82" ry="5" fill="#1F2B45" opacity=".18"/>
              <rect x="-36" y="-6" width="130" height="12" rx="2" fill="#2C3E66"/>
              <rect x="-68" y="-24" width="34" height="30" rx="6" fill="#2C3E66"/>
              <rect x="-57" y="-19" width="18" height="11" rx="2" fill="#DCE4F5"/>
              <rect x="-69" y="-8" width="4" height="6" rx="1" fill="#F0A81A"/>
              <rect x="-70" y="2" width="8" height="5" rx="1" fill="#1F2B45"/>
              <g transform="translate(-50,10)"><circle r="8" fill="#1F2B45"/><circle r="3.5" fill="#8A93AC"/>
                <g stroke="#1F2B45" strokeWidth="1.5"><animateTransform attributeName="transform" type="rotate" from="360" to="0" dur=".7s" repeatCount="indefinite"/><path d="M-3.5 0 H3.5 M0 -3.5 V3.5"/></g></g>
              <g transform="translate(20,10)"><circle r="8" fill="#1F2B45"/><circle r="3.5" fill="#8A93AC"/>
                <g stroke="#1F2B45" strokeWidth="1.5"><animateTransform attributeName="transform" type="rotate" from="360" to="0" dur=".7s" repeatCount="indefinite"/><path d="M-3.5 0 H3.5 M0 -3.5 V3.5"/></g></g>
              <g transform="translate(76,10)"><circle r="8" fill="#1F2B45"/><circle r="3.5" fill="#8A93AC"/>
                <g stroke="#1F2B45" strokeWidth="1.5"><animateTransform attributeName="transform" type="rotate" from="360" to="0" dur=".7s" repeatCount="indefinite"/><path d="M-3.5 0 H3.5 M0 -3.5 V3.5"/></g></g>
              <g filter="url(#glow)">
                <rect x="-34" y="-28" width="60" height="22" rx="3" fill="#F0A81A"/><rect x="-34" y="-28" width="60" height="4" rx="2" fill="#F6C65A"/>
                <text className="lbl" x="-4" y="-12" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#16233E">Intelligence</text>
                <rect x="30" y="-28" width="60" height="22" rx="3" fill="#23A55A"/><rect x="30" y="-28" width="60" height="4" rx="2" fill="#4CC07B"/>
                <text className="lbl" x="60" y="-12" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#FFFFFF">Advice</text>
                <rect x="-34" y="-52" width="60" height="22" rx="3" fill="#D64545"/><rect x="-34" y="-52" width="60" height="4" rx="2" fill="#E77070"/>
                <text className="lbl" x="-4" y="-36" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#FFFFFF">Corrections</text>
              </g>
              <g filter="url(#glow)">
                <rect x="30" y="-52" width="60" height="22" rx="3" fill="#2C5AA0"/><rect x="30" y="-52" width="60" height="4" rx="2" fill="#5B84C4"/>
                <text className="lbl" x="60" y="-36" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#FFFFFF">Nudges</text>
              </g>
            </g>
            <g>
              <ellipse cx="80" cy="214" rx="52" ry="5" fill="#1F2B45" opacity=".12"/>
              <rect x="38" y="118" width="84" height="94" fill="#FFFFFF" stroke="#1F2B45" strokeWidth="2"/>
              <polygon points="28,120 80,84 132,120" fill="#F0A81A" stroke="#1F2B45" strokeWidth="2" strokeLinejoin="round"/>
              <rect x="124" y="92" width="2" height="30" fill="#1F2B45"/><polygon points="126,92 142,97 126,102" fill="#D64545"/>
              <g fill="#E9EEF7" stroke="#1F2B45" strokeWidth="1.5">
                <rect x="48" y="132" width="20" height="18"/><rect x="92" y="132" width="20" height="18"/>
              </g>
              <g stroke="#1F2B45" strokeWidth="1"><path d="M58 132 V150 M48 141 H68 M102 132 V150 M92 141 H112"/></g>
              <rect x="70" y="170" width="20" height="42" fill="#16233E"/>
              <rect x="62" y="206" width="36" height="6" fill="#C9C2B2"/>
              <text x="80" y="236" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1F2B45">Classroom</text>
              <text x="80" y="252" textAnchor="middle" fontSize="11.5" fill="#55617D">EAs and children</text>
            </g>
            <g>
              <ellipse cx="520" cy="214" rx="60" ry="5" fill="#1F2B45" opacity=".12"/>
              <rect x="468" y="100" width="104" height="112" rx="4" fill="#16233E" stroke="#1F2B45" strokeWidth="2"/>
              <g fill="#F0A81A">
                <rect x="480" y="150" width="14" height="10" rx="1.5" opacity=".25"><animate attributeName="opacity" dur="9s" repeatCount="indefinite" values=".25;.25;1;1;.25;.25" keyTimes="0;0.356;0.37;0.45;0.467;1"/></rect>
                <rect x="500" y="150" width="14" height="10" rx="1.5" opacity=".25"><animate attributeName="opacity" dur="9s" repeatCount="indefinite" values=".25;.25;1;1;.25;.25" keyTimes="0;0.366;0.38;0.45;0.467;1"/></rect>
                <rect x="526" y="150" width="14" height="10" rx="1.5" opacity=".25"><animate attributeName="opacity" dur="9s" repeatCount="indefinite" values=".25;.25;1;1;.25;.25" keyTimes="0;0.376;0.39;0.45;0.467;1"/></rect>
                <rect x="546" y="150" width="14" height="10" rx="1.5" opacity=".25"><animate attributeName="opacity" dur="9s" repeatCount="indefinite" values=".25;.25;1;1;.25;.25" keyTimes="0;0.386;0.40;0.45;0.467;1"/></rect>
                <rect x="480" y="166" width="14" height="10" rx="1.5" opacity=".25"><animate attributeName="opacity" dur="9s" repeatCount="indefinite" values=".25;.25;1;1;.25;.25" keyTimes="0;0.39;0.40;0.45;0.467;1"/></rect>
                <rect x="546" y="166" width="14" height="10" rx="1.5" opacity=".25"><animate attributeName="opacity" dur="9s" repeatCount="indefinite" values=".25;.25;1;1;.25;.25" keyTimes="0;0.36;0.37;0.45;0.467;1"/></rect>
              </g>
              <rect x="506" y="176" width="28" height="36" rx="2" fill="#2C3E66"/>
              <g fill="#F0A81A" opacity=".25"><rect x="480" y="112" width="14" height="10" rx="1.5"/><rect x="500" y="112" width="14" height="10" rx="1.5"/><rect x="526" y="112" width="14" height="10" rx="1.5"/><rect x="546" y="112" width="14" height="10" rx="1.5"/><rect x="480" y="132" width="14" height="10" rx="1.5"/><rect x="546" y="132" width="14" height="10" rx="1.5"/></g>
              <rect x="496" y="92" width="48" height="10" rx="2" fill="#1F2B45"/>
              <circle cx="520" cy="80" r="24" fill="url(#dome)" stroke="#C9880D" strokeWidth="1.5">
                <animate attributeName="r" dur="9s" repeatCount="indefinite" values="24;24;27;24;27;24;24" keyTimes="0;0.356;0.39;0.42;0.45;0.467;1"/>
              </circle>
              <g transform="translate(520,80)">
                <animateTransform attributeName="transform" type="rotate" additive="sum" dur="9s" repeatCount="indefinite"
                                  values="0;0;360;360" keyTimes="0;0.356;0.467;1"/>
                <use href="#spark" fill="#FFFFFF" transform="scale(1.9)"/>
              </g>
              <circle cx="520" cy="80" r="26" fill="none" stroke="#F0A81A" strokeWidth="2" opacity="0">
                <animate attributeName="r" dur="9s" repeatCount="indefinite" values="26;26;60;26;26" keyTimes="0;0.356;0.43;0.431;1"/>
                <animate attributeName="opacity" dur="9s" repeatCount="indefinite" values="0;0;.9;0;0" keyTimes="0;0.356;0.36;0.43;1"/>
              </circle>
              <circle cx="520" cy="80" r="26" fill="none" stroke="#F0A81A" strokeWidth="1.5" opacity="0">
                <animate attributeName="r" dur="9s" repeatCount="indefinite" values="26;26;26;60;26;26" keyTimes="0;0.356;0.39;0.465;0.466;1"/>
                <animate attributeName="opacity" dur="9s" repeatCount="indefinite" values="0;0;0;.8;0;0" keyTimes="0;0.356;0.39;0.395;0.465;1"/>
              </circle>
              <g fill="#F0A81A" filter="url(#glow)">
                <use href="#spark" transform="scale(.8)"><animateMotion dur="7s" repeatCount="indefinite" calcMode="linear"><mpath href="#orbit"/></animateMotion>
                  <animate attributeName="opacity" dur="2.1s" repeatCount="indefinite" values="1;.3;1"/></use>
                <use href="#spark" transform="scale(.6)"><animateMotion dur="7s" begin="-2.3s" repeatCount="indefinite" calcMode="linear"><mpath href="#orbit"/></animateMotion>
                  <animate attributeName="opacity" dur="1.7s" repeatCount="indefinite" values=".4;1;.4"/></use>
                <use href="#spark" transform="scale(.7)"><animateMotion dur="7s" begin="-4.6s" repeatCount="indefinite" calcMode="linear"><mpath href="#orbit"/></animateMotion>
                  <animate attributeName="opacity" dur="2.6s" repeatCount="indefinite" values=".6;1;.2;1"/></use>
              </g>
              <g fill="#F0A81A" filter="url(#glow)">
                <use href="#spark" transform="translate(476,62)" opacity="0"><animate attributeName="opacity" dur="9s" repeatCount="indefinite" values="0;0;1;0;0" keyTimes="0;0.36;0.375;0.395;1"/></use>
                <use href="#spark" transform="translate(564,54) scale(1.3)" opacity="0"><animate attributeName="opacity" dur="9s" repeatCount="indefinite" values="0;0;1;0;0" keyTimes="0;0.375;0.39;0.415;1"/></use>
                <use href="#spark" transform="translate(520,44) scale(1.5)" opacity="0"><animate attributeName="opacity" dur="9s" repeatCount="indefinite" values="0;0;1;0;0" keyTimes="0;0.39;0.405;0.43;1"/></use>
                <use href="#spark" transform="translate(464,100) scale(.9)" opacity="0"><animate attributeName="opacity" dur="9s" repeatCount="indefinite" values="0;0;1;0;0" keyTimes="0;0.405;0.42;0.445;1"/></use>
                <use href="#spark" transform="translate(576,96) scale(1.1)" opacity="0"><animate attributeName="opacity" dur="9s" repeatCount="indefinite" values="0;0;1;0;0" keyTimes="0;0.42;0.435;0.46;1"/></use>
                <use href="#spark" transform="translate(548,46) scale(.8)" opacity="0"><animate attributeName="opacity" dur="9s" repeatCount="indefinite" values="0;0;1;0;0" keyTimes="0;0.43;0.445;0.467;1"/></use>
              </g>
              <text x="520" y="236" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1F2B45">Masi AI</text>
              <text x="520" y="252" textAnchor="middle" fontSize="11.5" fill="#55617D">reads every child, every day</text>
            </g>
            <text x="300" y="300" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1F2B45">The ZZ app</text>
            <text x="300" y="318" textAnchor="middle" fontSize="12" fill="#55617D">wide · two-way · ours</text>
          </svg>
  );
}
