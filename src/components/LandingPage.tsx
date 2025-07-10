import React, { useState } from 'react';
import { Scale, CheckCircle, Star, ArrowRight, Shield, Zap, Users } from 'lucide-react';
import Header from './Header';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LandingPage: React.FC = () => {
  const [] = useState(false);
  const [] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);

  const features = [
    {
      icon: Zap,
      title: "AI-Powered Analysis",
      description: "Advanced Gemini AI analyzes your contracts in seconds, not hours"
    },
    {
      icon: Shield,
      title: "Risk Assessment",
      description: "Identify potential risks and missing clauses before signing"
    },
    {
      icon: CheckCircle,
      title: "Completeness Check",
      description: "Ensure all essential fields are properly filled and documented"
    },
    {
      icon: Users,
      title: "Plain English Summary",
      description: "Complex legal jargon translated into easy-to-understand language"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Legal Counsel, TechStart Inc.",
      content: "This tool has revolutionized how we review contracts. What used to take hours now takes minutes.",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Business Owner",
      content: "As a non-lawyer, this gives me confidence in understanding my contracts before signing.",
      rating: 5
    },
    {
      name: "Emily Rodriguez",
      role: "Contract Manager",
      content: "The risk assessment feature has saved us from several problematic agreements.",
      rating: 5
    }
  ];

  const navigate = useNavigate();
  const { user } = useAuth();
  const handleStart = () => {
    if (user) {
      navigate('/analyzer');
    } else {
      navigate('/auth?mode=register');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />

      {/* Hero Section */}
      <section className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Star className="h-4 w-4" />
              <span>First 5 Contract Analysis Free</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Analyze Legal Contracts with
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block">
                AI Precision
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Transform complex legal documents into clear, actionable insights. 
              Get instant summaries, risk assessments, and completeness checks powered by advanced AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleStart}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-semibold text-lg flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
              >
                <span>Start Free Analysis</span>
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 font-semibold text-lg"
                onClick={() => setShowDemoModal(true)}
              >
                How It Works
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose Clario?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to make contract analysis fast, accurate, and accessible to everyone.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:from-blue-200 group-hover:to-purple-200 transition-all duration-200">
                  <feature.icon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Trusted by Legal Professionals
            </h2>
            <p className="text-xl text-gray-600">
              See what our users say about Clario
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center space-x-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed">"{testimonial.content}"</p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-gray-600 text-sm">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Start free, upgrade when you need more
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-8 rounded-2xl border-2 border-gray-200 hover:border-blue-300 transition-colors duration-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
              <p className="text-gray-600 mb-6">Perfect for getting started</p>
              <div className="text-4xl font-bold text-gray-900 mb-6">$0<span className="text-lg text-gray-600">/month</span></div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>5 contract analyses</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Basic summaries</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Field extraction</span>
                </li>
              </ul>
              <button
                onClick={handleStart}
                className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition-colors duration-200 font-semibold"
              >
                Get Started
              </button>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-8 rounded-2xl text-white relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
                Popular
              </div>
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <p className="text-blue-100 mb-6">For professionals and small teams</p>
              <div className="text-4xl font-bold mb-6">$29<span className="text-lg text-blue-200">/month</span></div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-white" />
                  <span>100 contract analyses</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-white" />
                  <span>Advanced risk assessment</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-white" />
                  <span>Export capabilities</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-white" />
                  <span>Priority support</span>
                </li>
              </ul>
              <button className="w-full bg-white text-blue-600 py-3 rounded-lg hover:bg-gray-100 transition-colors duration-200 font-semibold">
                Upgrade to Pro
              </button>
            </div>
            <div className="bg-white p-8 rounded-2xl border-2 border-gray-200 hover:border-purple-300 transition-colors duration-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
              <p className="text-gray-600 mb-6">For large organizations</p>
              <div className="text-4xl font-bold text-gray-900 mb-6">Custom</div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Unlimited analyses</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Custom integrations</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Dedicated support</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>SLA guarantee</span>
                </li>
              </ul>
              <button
                className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition-colors duration-200 font-semibold"
                onClick={() => {
                  const footer = document.querySelector('footer');
                  if (footer) {
                    footer.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Contract Analysis?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of professionals who trust Clario for their contract review needs.
          </p>
          <button
            onClick={handleStart}
            className="bg-white text-blue-600 px-8 py-4 rounded-xl hover:bg-gray-100 transition-colors duration-200 font-semibold text-lg shadow-lg"
          >
            Start Your Free Analysis Today
          </button>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                  <Scale className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold">Clario</span>
              </div>
              <p className="text-gray-400">
                Clarity for Legal Documents.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors" onClick={e => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}>Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors" onClick={e => { e.preventDefault(); document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); }}>Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="mailto:clario.help@proton.me" className="hover:text-white transition-colors">Contact: clario.help@proton.me</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Clario. All rights reserved.</p>
          </div>
        </div>
      </footer>
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg p-6 relative animate-fade-in flex flex-col items-center">
            <button onClick={() => setShowDemoModal(false)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl font-bold">&times;</button>
            <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">How It Works</h2>
            <p className="text-gray-600 text-center mb-4 max-w-md">Upload your contract, and our AI will instantly analyze it for risks, completeness, and key terms. Get a plain English summary and actionable insights in seconds.</p>
            <ol className="list-decimal list-inside text-gray-700 text-base mb-4 w-full max-w-md mx-auto">
              <li className="mb-2">Upload your contract (PDF or TXT).</li>
              <li className="mb-2">Our AI instantly analyzes the document for risks, completeness, and key terms.</li>
              <li className="mb-2">Receive a plain English summary and actionable insights in seconds.</li>
            </ol>
            <div className="w-full mt-2">
              <div className="bg-gray-100 rounded-lg p-3 text-sm text-gray-700 text-center">
                <span className="font-semibold">Example Result:</span> <br />
                <span className="text-gray-600">"This contract is low risk, complete, and clearly outlines payment terms and parties involved. No major issues detected."</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;