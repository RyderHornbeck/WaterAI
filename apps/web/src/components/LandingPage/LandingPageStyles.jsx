export function LandingPageStyles() {
  return (
    <style jsx global>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      
      .font-inter {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      .fade-in {
        animation: fadeIn 0.8s ease forwards;
      }

      .fade-in-delay-1 {
        opacity: 0;
        animation: fadeIn 0.8s ease 0.2s forwards;
      }

      .fade-in-delay-2 {
        opacity: 0;
        animation: fadeIn 0.8s ease 0.4s forwards;
      }

      .slide-in-left {
        animation: slideInLeft 0.6s ease forwards;
      }

      .slide-in-right {
        animation: slideInRight 0.6s ease forwards;
      }

      .fade-up {
        opacity: 0;
        transform: translateY(30px);
        transition:
          opacity 0.8s ease,
          transform 0.8s ease;
      }

      .fade-up-delay-1 {
        opacity: 0;
        transform: translateY(30px);
        transition:
          opacity 0.8s ease 0.2s,
          transform 0.8s ease 0.2s;
      }

      .fade-up-delay-2 {
        opacity: 0;
        transform: translateY(30px);
        transition:
          opacity 0.8s ease 0.4s,
          transform 0.8s ease 0.4s;
      }

      .fade-up.animate-in,
      .fade-up-delay-1.animate-in,
      .fade-up-delay-2.animate-in {
        opacity: 1;
        transform: translateY(0);
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes slideInLeft {
        from {
          opacity: 0;
          transform: translateX(-30px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(30px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      html {
        scroll-behavior: smooth;
      }
    `}</style>
  );
}
