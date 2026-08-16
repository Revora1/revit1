const fs = require('fs');
let code = fs.readFileSync('src/components/Feed.tsx', 'utf8');

code = code.replace(/const handleScroll = \(\) => \{/, `
  useEffect(() => {
    const handleRefreshEvent = () => {
      setRefreshKey(k => k + 1);
      if (containerRef.current) {
        containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('refresh-feed', handleRefreshEvent);
    return () => window.removeEventListener('refresh-feed', handleRefreshEvent);
  }, []);

  const handleScroll = () => {`);

fs.writeFileSync('src/components/Feed.tsx', code);
