import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  Shield, 
  Activity, 
  ArrowRight, 
  CheckCircle,
  MessageSquare,
  Clock
} from 'lucide-react';

const slides = [
  {
    title: "Welcome to CareMaster",
    description: "Your all-in-one platform for compassionate, connected care. Manage your health journey with ease.",
    icon: Heart,
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50"
  },
  {
    title: "Secure & Reliable",
    description: "Your health data is protected with enterprise-grade security and HIPAA compliance. Your privacy is our priority.",
    icon: Shield,
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-50"
  },
  {
    title: "Stay Connected",
    description: "Consult with doctors, monitor vitals, and manage medications from anywhere, anytime.",
    icon: Activity,
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50"
  }
];

const Onboarding = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-white overflow-hidden`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="flex flex-col items-center text-center max-w-md w-full"
        >
          <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${slide.color} shadow-lg flex items-center justify-center mb-8`}>
            <Icon className="w-12 h-12 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">
            {slide.title}
          </h2>
          
          <p className="text-lg text-gray-600 leading-relaxed mb-12 px-4">
            {slide.description}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="mt-auto w-full max-w-md space-y-6">
        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentSlide === i ? 'w-8 bg-blue-600' : 'w-2 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Action button */}
        <button
          onClick={handleNext}
          className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold text-lg shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          {currentSlide === slides.length - 1 ? (
            <>
              Get Started
              <CheckCircle className="w-5 h-5" />
            </>
          ) : (
            <>
              Next
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {/* Skip button */}
        {currentSlide < slides.length - 1 && (
          <button
            onClick={onComplete}
            className="w-full text-gray-400 font-medium py-2 hover:text-gray-600 transition-colors"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
