import { CoachPhone } from "./coach-hero";

/* Hero: the AI coach demo beside the four programme benefits. */
export function CoachHero() {
  return (
    <header className="hero">
      <div className="wrap">
        <p className="eyebrow">Masinyusane · the Zazi iZandi app</p>
        <h1>A coach in every EA’s pocket</h1>
        <p className="lede">
          Every EA carries an AI coach that knows the curriculum and every child in
          their groups. Ask it anything, and the answer arrives in the classroom, the same day.
        </p>
        <div className="aigrid">
          <CoachPhone />
          <ul className="ben">
                <li><span className="bi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></svg></span>
                  <div><b>Programme quality improves</b>
                  <p>The AI holds the whole curriculum and every child’s progress. It tells each EA which group to take next, and which letters to teach.</p></div>
                </li>
                <li><span className="bi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 2 8l10 5 10-5-10-5z"/><path d="M6 10.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-5.5"/><path d="M22 8v6"/></svg></span>
                  <div><b>Reduced training costs</b>
                  <p>Training time and cost can be cut in half. With the AI holding the curriculum, we no longer spend days drilling Teaching at the Right Level (TaRL). Training goes into the soft skills EAs bring to children.</p></div>
                </li>
                <li><span className="bi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span>
                  <div><b>Real-time programme insight</b>
                  <p>Site observations, school visits, write-ups, then waiting for the next visit: that loop took weeks. Now an EA asks, and the answer arrives before the next group sits down.</p></div>
                </li>
                <li><span className="bi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13l2-5a2 2 0 0 1 2-1.5h10A2 2 0 0 1 19 8l2 5v5H3z"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/><path d="M3 13h18"/></svg></span>
                  <div><b>More effective programme management</b>
                  <p>A field officer can watch one session a day. The app sees every session, everywhere.</p></div>
                </li>
              </ul>
        </div>
        <div className="banner"><strong>Superintelligence</strong> in South African classrooms.</div>
      </div>
    </header>
  );
}
