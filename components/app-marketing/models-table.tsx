/* Comparison of the three delivery models. Static content; ticks and status
   pills live here so the marketing page and the partner artifact stay aligned. */
export function ModelsTable() {
  return (
    <section>
      <div className="wrap">
        <p className="eyebrow">The models at a glance</p>
        <h2>Three models, one method</h2>
        <div className="compare">
          <div className="scrollx">
            <table>
                <thead><tr>
                  <th></th>
                  <th className="col"><span className="colname">Zazi iZandi</span><span className="coltag">paper</span></th>
                  <th className="col"><span className="colname">+ Survey app</span><span className="coltag">generic · one-way</span></th>
                  <th className="col plus"><span className="colname">Zazi iZandi <em>Plus</em></span><span className="coltag">our app + intelligence</span></th>
                </tr></thead>
                <tbody>
                  <tr className="subhead"><td colSpan={4}>The classroom method</td></tr>
                  <tr><td>Teaching at the Right Level, daily small groups</td><td className="mark"><span className="yes">✓</span></td><td className="mark"><span className="yes">✓</span></td><td className="mark plus"><span className="yes">✓</span></td></tr>
                  <tr><td>Masi training, materials and curriculum</td><td className="mark"><span className="yes">✓</span></td><td className="mark"><span className="yes">✓</span></td><td className="mark plus"><span className="yes">✓</span></td></tr>
                  <tr><td>Letter-by-letter tracker for every child</td><td className="mark"><span className="yes">✓</span></td><td className="mark"><span className="yes">✓</span></td><td className="mark plus"><span className="yes">✓</span></td></tr>
                  <tr><td>Termly assessments</td><td className="mark"><span className="yes">✓</span></td><td className="mark"><span className="yes">✓</span></td><td className="mark plus"><span className="yes">✓</span></td></tr>
                  <tr><td>Works without devices</td><td className="mark"><span className="yes">✓</span></td><td className="mark"><span className="no">—</span></td><td className="mark plus"><span className="no">—</span></td></tr>
                  <tr className="subhead"><td colSpan={4}>The nervous system</td></tr>
                  <tr><td>App captures every session <span className="status live">live</span></td><td className="mark"><span className="no">—</span></td><td className="mark"><span className="yes">✓</span></td><td className="mark plus"><span className="yes">✓</span></td></tr>
                  <tr className="hl"><td>Capture what each child knows - daily <span className="status live">live</span></td><td className="mark"><span className="no">—</span></td><td className="mark"><span className="no">—</span></td><td className="mark plus"><span className="yes">✓</span></td></tr>
                  <tr><td>Live dashboards for the team <span className="status live">live</span></td><td className="mark"><span className="no">—</span></td><td className="mark"><span className="yes">✓</span></td><td className="mark plus"><span className="yes">✓</span></td></tr>
                        <tr><td>EA performance map <span className="status live">live</span></td><td className="mark"><span className="no">—</span></td><td className="mark"><span className="half">½</span></td><td className="mark plus"><span className="yes">✓</span></td></tr>
                  <tr><td>Quality flags on every group <span className="status live">live</span></td><td className="mark"><span className="no">—</span></td><td className="mark"><span className="half">½</span></td><td className="mark plus"><span className="yes">✓</span></td></tr>
                  <tr><td>WhatsApp mentor desk <span className="status beta">beta</span></td><td className="mark"><span className="no">—</span></td><td className="mark"><span className="half">½</span></td><td className="mark plus"><span className="yes">✓</span></td></tr>
                  <tr><td>Push nudges to EAs <span className="status soon">rolling out</span></td><td className="mark"><span className="no">—</span></td><td className="mark"><span className="no">—</span></td><td className="mark plus"><span className="yes">✓</span></td></tr>
                  <tr><td>Streaks and awards for EAs <span className="status live">live</span></td><td className="mark"><span className="no">—</span></td><td className="mark"><span className="no">—</span></td><td className="mark plus"><span className="yes">✓</span></td></tr>
                  <tr><td>Weekly funder-ready reporting <span className="status soon">rolling out</span></td><td className="mark"><span className="no">—</span></td><td className="mark"><span className="no">—</span></td><td className="mark plus"><span className="yes">✓</span></td></tr>
                  <tr className="hl"><td>AI coach with superintelligence <span className="status beta">beta</span></td><td className="mark"><span className="no">—</span></td><td className="mark"><span className="no">—</span></td><td className="mark plus"><span className="yes">✓</span></td></tr>
                </tbody>
              </table>
          </div>
          <div className="tagline">
            Same classroom method. The difference is what you can <strong>see</strong> - and what you can do about it.
          </div>
        </div>
        <p className="legend">½ = partial · session data alone supports activity views - maps, flags, a desk - but nothing about <em>learning</em>.</p>
      </div>
    </section>
  );
}
