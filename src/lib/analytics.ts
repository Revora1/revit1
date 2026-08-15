export const trackOutboundClick = () => {
  const consent = localStorage.getItem('gdpr-consent');
  if (consent !== 'accepted') return;

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'conversion', {
      'send_to': 'AW-17715078634/dcnLCIWDiK4cEOrLmv9B'
    });
  }
};
