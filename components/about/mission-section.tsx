import Image from "next/image";

export default function MissionSection() {
  return (
    <section className="py-16 bg-white overflow-x-hidden">
      <div className="container max-w-6xl">
        {/* The Crisis */}
        <div className="mb-16">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-1 bg-accent-yellow" />
              <span className="text-sm font-semibold uppercase tracking-widest text-primary">
                The Crisis
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              The Crisis We're Addressing
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-16 items-stretch">
            {/* Reading Crisis card */}
            <div className="relative pt-4 pl-4 pb-4 pr-4 flex flex-col">
              <div className="absolute -top-4 -left-4 w-20 h-20 bg-accent-yellow rounded-lg z-0" />
              <div className="relative z-10 rounded-xl overflow-hidden shadow-2xl bg-white p-3 flex items-center justify-center flex-1">
                <Image
                  src="/images/reading-crisis.svg"
                  alt="Reading Crisis infographic"
                  width={600}
                  height={400}
                  className="w-[85%] h-auto"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 w-14 h-14 bg-primary/10 rounded-lg z-0" />
            </div>

            {/* Unemployment Crisis card */}
            <div className="relative pt-4 pl-4 pb-4 pr-4 flex flex-col">
              <div className="absolute -top-4 -left-4 w-20 h-20 bg-accent-yellow rounded-lg z-0" />
              <div className="relative z-10 rounded-xl overflow-hidden shadow-2xl bg-white p-3 flex items-center justify-center flex-1">
                <Image
                  src="/images/unemployment-crisi.svg"
                  alt="Youth Unemployment infographic"
                  width={600}
                  height={400}
                  className="w-[85%] h-auto"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 w-14 h-14 bg-primary/10 rounded-lg z-0" />
            </div>
          </div>
        </div>

        {/* Our Solution */}
        <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl p-8 md:p-12">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-1 bg-accent-yellow" />
              <span className="text-sm font-semibold uppercase tracking-widest text-primary">
                Our Solution
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Our Two-Pronged Solution
            </h2>
          </div>

          <p className="text-lg text-gray-700 mb-8">
            <strong>Zazi iZandi</strong> addresses both crises simultaneously by recruiting
            unemployed community youth, training them as <em>Literacy Coaches</em>, and
            deploying them in public Grade R &amp; Grade 1 classrooms.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-primary font-bold text-lg mb-2">✓ Improve Literacy</div>
              <p className="text-gray-600">
                Evidence-based interventions that help children master letter sounds and
                reading fundamentals—strong predictors of later reading success.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-primary font-bold text-lg mb-2">✓ Create Jobs</div>
              <p className="text-gray-600">
                Provide meaningful employment and professional development opportunities
                for unemployed youth in their own communities.
              </p>
            </div>
          </div>

          <div className="mt-8 p-6 bg-white/50 rounded-lg border border-primary-200">
            <p className="text-sm text-gray-700">
              <strong>Partnership Model:</strong> Zazi iZandi was developed and launched in
              partnership by <strong>Binding Constraints Labs</strong> and <strong>Masinyusane</strong>,
              with input from leading South African educational organizations including
              <strong> Wordworks</strong> and <strong>Funda Wande</strong>, as well as experts in the field.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
