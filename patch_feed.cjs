const fs = require('fs');
let code = fs.readFileSync('mobile-app/screens/FeedScreen.tsx', 'utf8');

// Add flatListRef
if (!code.includes('flatListRef = useRef')) {
    code = code.replace(/const \[activeIndex, setActiveIndex\] = useState\(0\);/, "const [activeIndex, setActiveIndex] = useState(0);\n  const flatListRef = useRef<any>(null);");
}

// Add tabPress listener
if (!code.includes('tabPress')) {
    code = code.replace(/const fetchPosts = async \(\) => \{/, `useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e: any) => {
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      }
      fetchPosts();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchPosts = async () => {`);
}

// Add ref to FlatList
code = code.replace(/<FlatList\s+data=\{visiblePosts\}/, "<FlatList\n            ref={flatListRef}\n            data={visiblePosts}");

fs.writeFileSync('mobile-app/screens/FeedScreen.tsx', code);
