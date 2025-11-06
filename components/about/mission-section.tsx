import { AlertCircle, TrendingDown, Users, Target } from "lucide-react";

export default function MissionSection() {
  return (
    <section className="py-16 bg-white">
      <div className="container max-w-6xl">
        {/* The Crisis */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <h2 className="text-3xl font-bold text-gray-900">The Crisis We're Addressing</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded-lg">
              <div className="flex items-start gap-4">
                <TrendingDown className="h-8 w-8 text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-xl text-gray-900 mb-2">Reading Crisis</h3>
                  <p className="text-gray-700 mb-3">
                    <span className="text-3xl font-bold text-red-600">81%</span> of South African 
                    children cannot read for meaning by age 10.
                  </p>
                  <p className="text-sm text-gray-600">
                    In the Eastern Cape, fewer than <strong>27%</strong> of Grade 1 learners 
                    meet the government's letter-knowledge benchmark.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 border-l-4 border-orange-600 p-6 rounded-lg">
              <div className="flex items-start gap-4">
                <Users className="h-8 w-8 text-orange-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-xl text-gray-900 mb-2">Youth Unemployment</h3>
                  <p className="text-gray-700 mb-3">
                    South Africa has one of the <span className="font-bold text-orange-600">highest 
                    youth unemployment rates</span> globally.
                  </p>
                  <p className="text-sm text-gray-600">
                    Millions of capable young South Africans lack meaningful employment opportunities.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Our Solution */}
        <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl p-8 md:p-12">
          <div className="flex items-center gap-3 mb-6">
            <Target className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-bold text-gray-900">Our Two-Pronged Solution</h2>
          </div>
          
          <p className="text-lg text-gray-700 mb-8">
            <strong>Zazi iZandi</strong> addresses both crises simultaneously by recruiting 
            unemployed community youth, training them as <em>Literacy Coaches</em>, and 
            deploying them in public Grade R & Grade 1 classrooms.
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
              <strong> Wordworks</strong> and <strong>Funda Wande</strong>, as well as experts 
              such as <strong>Shelley O'Carroll</strong> and <strong>Jenny Kratz</strong>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}